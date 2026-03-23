from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    detect_student_email,
)
from app.services.point_service import award_points
from app.dependencies import get_current_user

router  = APIRouter(tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=TokenResponse)
@limiter.limit("10/minute")
async def register(request: Request, data: UserCreate, db: AsyncSession = Depends(get_db)):
    email_norm = _normalize_email(str(data.email))
    existing = await db.execute(select(User).where(func.lower(User.email) == email_norm))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Bu e-posta adresi zaten kayıtlı")

    is_student, university = detect_student_email(email_norm)
    user = User(
        email           = email_norm,
        hashed_password = hash_password(data.password),
        full_name       = data.full_name,
        city            = data.city,
        is_student      = is_student,
        university_name = university,
        role            = "student" if is_student else "user",
        is_active       = True,  # MVP: email doğrulamasını basit tutalım
    )
    db.add(user)
    await db.flush()

    await award_points(db, str(user.id), 30, "profile_complete")

    access_token  = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token  = access_token,
        refresh_token = refresh_token,
        user          = UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    email_norm = _normalize_email(str(data.email))
    result = await db.execute(select(User).where(func.lower(User.email) == email_norm))
    user   = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "E-posta veya şifre yanlış")

    if not user.is_active:
        raise HTTPException(403, "Hesabın henüz aktif değil. E-postanı doğrula.")

    access_token  = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token  = access_token,
        refresh_token = refresh_token,
        user          = UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout():
    # Token silme client tarafında yapılır; backend sadece 200 döner
    return {"message": "Başarıyla çıkış yapıldı"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh_token(data: dict, db: AsyncSession = Depends(get_db)):
    from jose import jwt, JWTError
    from app.config import settings
    try:
        payload = jwt.decode(data.get("refresh"), settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        user    = await db.get(User, user_id)
        if not user:
            raise HTTPException(401, "Geçersiz token")
        return {"access_token": create_access_token(str(user.id))}
    except JWTError:
        raise HTTPException(401, "Geçersiz token")
