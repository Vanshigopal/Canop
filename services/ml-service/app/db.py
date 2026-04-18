import re

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


def _sanitize_dsn(dsn: str) -> str:
    # asyncpg doesn't accept ?schema=public query params
    return re.sub(r"\?schema=[^&]*", "", dsn)


async def init_db() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        _sanitize_dsn(settings.database_url),
        min_size=1,
        max_size=5,
        command_timeout=30,
    )


async def close_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool
