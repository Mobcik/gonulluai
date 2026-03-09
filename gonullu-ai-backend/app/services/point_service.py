from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select
from app.models.user import User
from app.models.reward import PointTransaction, RewardUnlock, DigitalReward, Notification

BADGE_THRESHOLDS = [
    (3000, "efsane"),
    (1500, "lider"),
    (700,  "deneyimli"),
    (300,  "aktif"),
    (100,  "genc"),
    (0,    "filiz"),
]

DIGITAL_REWARD_THRESHOLDS = [100, 300, 500, 750, 1000, 1500]


async def award_points(
    db: AsyncSession,
    user_id: str,
    points: int,
    reason: str,
    event_id: str | None = None,
) -> None:
    db.add(PointTransaction(
        user_id=user_id,
        points=points,
        reason=reason,
        event_id=event_id,
    ))

    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(
            total_points=User.total_points + points,
            earned_points=User.earned_points + (points if points > 0 else 0),
        )
    )

    await check_badge_upgrade(db, user_id)
    await check_digital_reward_unlock(db, user_id)
    await db.commit()


async def deduct_points(db: AsyncSession, user_id: str, points: int, reason: str) -> None:
    db.add(PointTransaction(user_id=user_id, points=-abs(points), reason=reason))
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(total_points=User.total_points - abs(points))
    )
    await db.commit()


async def check_badge_upgrade(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return
    for threshold, badge in BADGE_THRESHOLDS:
        if user.earned_points >= threshold:
            if user.badge != badge:
                await db.execute(
                    update(User).where(User.id == user_id).values(badge=badge)
                )
                db.add(Notification(
                    user_id=user_id,
                    type="badge_unlocked",
                    message=f"🎉 Yeni rozet kazandın: {badge}!",
                ))
            break


async def check_digital_reward_unlock(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    rewards = await db.execute(
        select(DigitalReward).where(DigitalReward.threshold <= user.earned_points)
    )
    rewards_list = rewards.scalars().all()

    for reward in rewards_list:
        existing = await db.execute(
            select(RewardUnlock).where(
                RewardUnlock.user_id == user_id,
                RewardUnlock.reward_id == reward.id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(RewardUnlock(user_id=user_id, reward_id=reward.id))
            db.add(Notification(
                user_id=user_id,
                type="reward_unlocked",
                message=f"🏅 Yeni ödül kazandın: {reward.name}!",
            ))
