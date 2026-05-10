from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://mes:mes@localhost:5432/smart_mes"
    SECRET_KEY: str = "dev-secret-key"

    model_config = {"env_file": ".env"}


settings = Settings()
