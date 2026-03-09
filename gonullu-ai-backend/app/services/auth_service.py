from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt
from app.config import settings

EDU_DOMAINS: dict[str, str] = {
    "itu.edu.tr":      "İstanbul Teknik Üniversitesi",
    "boun.edu.tr":     "Boğaziçi Üniversitesi",
    "metu.edu.tr":     "Orta Doğu Teknik Üniversitesi",
    "bilkent.edu.tr":  "Bilkent Üniversitesi",
    "ku.edu.tr":       "Koç Üniversitesi",
    "sabanciuniv.edu": "Sabancı Üniversitesi",
    "selcuk.edu.tr":   "Selçuk Üniversitesi",
    "konya.edu.tr":    "Konya Teknik Üniversitesi",
    "ktu.edu.tr":      "Karadeniz Teknik Üniversitesi",
    "ankara.edu.tr":   "Ankara Üniversitesi",
    "ege.edu.tr":      "Ege Üniversitesi",
    "hacettepe.edu.tr":"Hacettepe Üniversitesi",
    "gazi.edu.tr":     "Gazi Üniversitesi",
    "ibu.edu.tr":      "İzmir Bakırçay Üniversitesi",
    "deu.edu.tr":      "Dokuz Eylül Üniversitesi",
    "uludag.edu.tr":   "Uludağ Üniversitesi",
}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def detect_student_email(email: str) -> tuple[bool, str | None]:
    domain = email.split("@")[-1].lower()
    university = EDU_DOMAINS.get(domain)
    if not university and (domain.endswith(".edu.tr") or domain.endswith(".edu")):
        university = domain.split(".")[0].upper() + " Üniversitesi"
    return bool(university), university
