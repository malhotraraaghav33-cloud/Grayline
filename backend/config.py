import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PROJECT_NAME: str = "GRAYLINE Field Terminal"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./grayline_tactical.db")
    
    # Auth & Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "TACTICAL_DEFENSE_GRAYLINE_LOCAL_DEV_SECRET_KEY_CHANGE_IN_PROD")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
    
    # Optional GPU inference configuration
    INFERENCE_SERVICE_URL: str = os.getenv("INFERENCE_SERVICE_URL", "")
    INFERENCE_SERVICE_API_KEY: str = os.getenv("INFERENCE_SERVICE_API_KEY", "")
    INFERENCE_TIMEOUT_SECONDS: float = float(os.getenv("INFERENCE_TIMEOUT_SECONDS", "5.0"))

    @property
    def cors_origin_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
