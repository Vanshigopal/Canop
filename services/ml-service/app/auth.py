from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_internal_key(x_api_key: str = Header(...)) -> bool:
    if x_api_key != settings.ml_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
    return True
