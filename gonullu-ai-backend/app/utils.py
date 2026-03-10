"""
Uygulama genelinde kullanılan ortak yardımcı fonksiyonlar.
"""

from uuid import uuid4


def new_uuid() -> str:
    """UUID4 formatında benzersiz bir string kimlik üretir.

    SQLAlchemy model sütunlarının primary key varsayılan değeri olarak
    kullanılır. String formatı, SQLite ile uyumluluğu garanti eder.
    """
    return str(uuid4())
