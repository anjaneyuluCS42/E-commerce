import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from app.config import (
    REDIS_URL,
    REDIS_MAX_CONNECTIONS,
    REDIS_SOCKET_TIMEOUT,
    REDIS_HEALTH_CHECK_INTERVAL,
)

# Use explicit Redis connection pool
pool = ConnectionPool.from_url(
    REDIS_URL,
    decode_responses=True,
    protocol=2,
    max_connections=REDIS_MAX_CONNECTIONS,
    socket_timeout=REDIS_SOCKET_TIMEOUT,
    health_check_interval=REDIS_HEALTH_CHECK_INTERVAL,
    retry_on_timeout=True,
)
redis_client = redis.Redis(connection_pool=pool)
