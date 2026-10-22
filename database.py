from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Base directory for the backend package to ensure school.db is located in backend folder
BASE_DIR = Path(__file__).resolve().parent
DATABASE_FILE = BASE_DIR / "school.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# Create SQLite database engine
# check_same_thread=False allows FastAPI to interact across multiple threads
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Session factory bound to the SQLite engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base model for SQLAlchemy models
Base = declarative_base()


def get_db():
    """Dependency that provides an active database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
