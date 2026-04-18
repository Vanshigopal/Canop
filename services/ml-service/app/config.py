from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    port: int = 8000
    environment: str = "development"
    log_level: str = "INFO"

    ml_service_api_key: str = "dev-internal-key"

    database_url: str = (
        "postgresql://raquel:raquel_dev_password@localhost:5432/raquel_dev"
    )

    models_dir: str = "app/models/trained"

    omr_confidence_threshold: float = 0.75
    bubble_min_area: int = 80
    bubble_max_area: int = 1500


settings = Settings()
