from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://scheduler:scheduler_pass@localhost:5434/terminal_scheduler"
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "changeme"


settings = Settings()
