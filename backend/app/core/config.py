"""Application configuration via Pydantic Settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    PROJECT_NAME: str = "SentinelLite"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel_lite"

    # JWT / Auth
    SECRET_KEY: str = "CHANGE-ME-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Configuration (Gemini, OpenAI, Claude)
    DEFAULT_AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Keep-Alive Worker (Prevents Render Free-Tier Spin-Down)
    RENDER_EXTERNAL_URL: str = ""
    KEEP_ALIVE_ENABLED: bool = True
    KEEP_ALIVE_INTERVAL_SECONDS: int = 600

    # Telemetry Log Retention & Deletion Policy
    LOG_RETENTION_DAYS: int = 7
    AUTO_RETENTION_CLEANUP_ENABLED: bool = True
    RETENTION_CHECK_INTERVAL_SECONDS: int = 3600

    # CORS – comma-separated or JSON list
    CORS_ORIGINS: str = "https://sentinel-lite-bice.vercel.app,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list."""
        import json
        val = self.CORS_ORIGINS.strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed]
            except Exception:
                pass
        return [origin.strip().strip("'\"[]") for origin in val.split(",") if origin.strip().strip("'\"[]")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()
