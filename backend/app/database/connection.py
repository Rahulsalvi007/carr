from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Create engine with thread-safe settings for SQLite or connection pool for PostgreSQL
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import backend.app.database.models # ensure models are registered
    Base.metadata.create_all(bind=engine)
    # Safe migration: ensure 'notes' column exists in detections table
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE detections ADD COLUMN notes TEXT"))
            conn.commit()
    except Exception:
        pass # Column already exists

