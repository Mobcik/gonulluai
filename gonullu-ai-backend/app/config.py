from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./gonulluai.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "gonulluai-photos"

    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # Yerel / kendi modeliniz: Ollama çalışıyorsa (ollama serve). Boşsa devre dışı.
    OLLAMA_BASE_URL: Optional[str] = None  # örn. http://127.0.0.1:11434
    OLLAMA_MODEL: str = "llama3.2"  # ollama pull … veya kendi Modelfile ile oluşturduğunuz ad

    REDIS_URL: str = "redis://localhost:6379"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:5175"
    BACKEND_URL:  str = "http://localhost:8000"
    # Virgülle ayrılmış ek origin'ler (Vite varsayılan 5173 + proje 5175). Prod'da daraltın.
    CORS_ALLOW_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5175,http://127.0.0.1:5175"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


def cors_allow_origins() -> list[str]:
    """FRONTEND_URL + CORS_ALLOW_ORIGINS birleşimi, tekrarsız."""
    seen: set[str] = set()
    out: list[str] = []
    for o in [settings.FRONTEND_URL] + [
        s.strip() for s in (settings.CORS_ALLOW_ORIGINS or "").split(",") if s.strip()
    ]:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out
