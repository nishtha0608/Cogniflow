from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./cogniflow.db"
    SECRET_KEY: str = "cogniflow-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    UPLOAD_DIR: str = "/tmp/uploads"
    API_BASE_URL: str = "http://localhost:8000"

    REDIS_URL: str = "redis://redis:6379/0"

    DEMO_USER_EMAIL: str = "demo@cogniflow.ai"
    DEMO_USER_PASSWORD: str = "demo123456"
    DEMO_USER_NAME: str = "Demo Researcher"

    FIREBASE_PROJECT_ID: str = ""

    OPENALEX_API_KEY: str = ""

    CHROMA_PATH: str = "/app/chroma"

    class Config:
        env_file = ".env"


settings = Settings()
