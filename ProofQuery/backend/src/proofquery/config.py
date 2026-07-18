from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: SecretStr | None = None
    openai_model: str | None = None
    max_upload_bytes: int = 50 * 1024 * 1024
    session_ttl_seconds: int = 60 * 60
    query_timeout_seconds: float = 10.0
    query_row_limit: int = 500

