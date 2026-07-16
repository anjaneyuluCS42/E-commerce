# 🛒 ShopHub - Full-Stack AI-Powered E-Commerce Platform

[![ShopHub CI/CD Pipeline](https://github.com/anjaneuyuluCS42/E-commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/anjaneuyuluCS42/E-commerce/actions/workflows/ci.yml)

ShopHub is a production-grade, full-stack e-commerce application modeled after industry giants. It features a modern React Single Page Application (SPA), a high-concurrency async FastAPI backend, real-time customer support WebSockets, distributed Celery task queues, and an intelligent AI Shopping Assistant powered by LLMs with multi-provider fallback.

---

## ⚡ Architecture & Tech Stack

```mermaid
graph TD
    User[Client Browser / React SPA] -->|HTTP / WebSockets| Nginx[Nginx Frontend Proxy]
    Nginx -->|Route static files| Static[React Assets]
    Nginx -->|Proxy API calls| Gunicorn[Gunicorn / FastAPI Backend]
    Gunicorn -->|Read/Write| Postgres[(PostgreSQL Database)]
    Gunicorn -->|Cache & Pub/Sub| Redis[(Redis Cache / Broker)]
    Gunicorn -->|Trigger background tasks| Celery[Celery Workers]
    Celery -->|Process tasks| Redis
    Celery -->|Generate invoices| PDF[PDF Invoice Service]
    Gunicorn -->|Upload product images| Cloudinary[Cloudinary Cloud Storage]
```

### Backend
- **FastAPI**: Async HTTP handlers and routing.
- **SQLAlchemy (Async)**: Object-relational mapping with PostgreSQL pooling.
- **PostgreSQL**: Primary transactional database.
- **Redis**: Real-time WebSocket support chat, notification caches, and Celery task broker.
- **Celery**: Background task worker and beat scheduler.
- **Gunicorn + Uvicorn Workers**: High-concurrency production ASGI process manager.

### Frontend
- **React**: Single Page Application (Vite builder).
- **TanStack Query**: Network state and API query management.
- **Tailwind CSS**: Modern utility styling framework.

---

## 📷 Application Screenshots

### E-Commerce Customer Storefront
![ShopHub Customer Storefront](media/media__1784181573631.png)

### Admin Product Management Dashboard
![ShopHub Admin Dashboard](media/media__1784194326934.png)

### Edit Product Panel
![ShopHub Edit Product](media/media__1784198042298.png)

---

## 📂 Folder Structure

```
.
├── Backend/                 # FastAPI Application Codebase
│   ├── app/
│   │   ├── cache/           # Redis cache and connections pooling
│   │   ├── core/            # Logging, Sentry, and observability middleware
│   │   ├── models/          # SQLAlchemy database models with optimization indexes
│   │   ├── routers/         # API endpoints (Auth, Products, Cart, Orders)
│   │   ├── schemas/         # Pydantic V2 validation schemas
│   │   ├── services/        # Third-party integrations (Cloudinary, PDF)
│   │   └── tasks/           # Celery background tasks
│   ├── tests/               # Pytest async testing suite
│   ├── Dockerfile           # Multi-stage secure Docker configuration
│   ├── gunicorn_conf.py     # Production Gunicorn worker parameters
│   └── requirements.txt     # Python backend dependencies
├── Frontend/                # React Vite Application Codebase
│   ├── src/                 # Source components, views, and services
│   ├── Dockerfile           # Multi-stage secure Nginx static hosting Dockerfile
│   └── nginx.conf           # Non-root Nginx routing rules
├── scripts/                 # Administration scripts
│   ├── backup.sh            # Compressed PostgreSQL backup utility
│   └── restore.sh           # PostgreSQL recovery utility
├── docker-compose.yml       # Production Docker service coordination
├── locustfile.py            # Locust load testing simulator
└── README.md                # General documentation
```

---

## ⚙️ Environment Variables

Copy the `.env.example` template to create your `.env` configuration file:

```ini
# Environment
ENVIRONMENT=production
DEBUG=False
FRONTEND_URL=https://ecommerce-shophub-seven.vercel.app

# Database Connection
DATABASE_URL=postgresql+asyncpg://postgres:postgres_password@postgres:5432/postgres

# Database Pool Configuration
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
DB_POOL_PRE_PING=True

# Redis Connection Pool Configuration
REDIS_URL=redis://redis:6379/0
REDIS_MAX_CONNECTIONS=50
REDIS_SOCKET_TIMEOUT=5.0
REDIS_HEALTH_CHECK_INTERVAL=30

# Authentication & Security
SECRET_KEY=your_super_secret_jwt_signature_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_HOSTS=e-commerce-pice.onrender.com,localhost,127.0.0.1

# Cloudinary Storage Configuration (for permanent image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI LLM Provider Keys
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here
```

---

## 🐳 Docker Production Setup

Our Docker production configuration is hardened for cloud deployments.

### Security Hardening Actions
1. **Multi-Stage Builds**: Removes compilers and dev-tools from final runtime images, significantly reducing the attack surface and image size.
2. **Non-Root Execution**: Backend runs as `appuser` (UID `10001`). Nginx frontend runs as `nginx` user.
3. **Resource Limits**: Configures CPU and memory boundaries for each container inside `docker-compose.yml` to prevent DoS attacks via host resource exhaustion.
4. **Dropped Privileges**: Configures `no-new-privileges: true` for all running container services.

### Running with Docker Compose
To launch the complete production stack (Database, Redis, Backend, Workers, Beat, and Frontend Nginx) in the background:
```bash
docker-compose up -d --build
```

To verify running services:
```bash
docker-compose ps
```

---

## 🚀 Running Gunicorn Web Server

The backend runs inside Gunicorn using the ASGI Uvicorn worker class for production scale. Configurations are defined inside [gunicorn_conf.py](file:///d:/knowledge_factory_internship/E-commerce/Backend/gunicorn_conf.py):
- **Dynamic Workers**: Spawns `(2 * CPU_CORES) + 1` worker processes.
- **Graceful Timeouts**: Prevents hanging requests with a 120s execution limit.
- **Worker Recycling**: Restarts worker processes after 1000 requests (plus random jitter) to prevent memory leak accumulation.

### Startup Command (Natively)
```bash
cd Backend
gunicorn -c gunicorn_conf.py app.main:app
```

---

## 📈 Running Locust Load Testing

Our Locust configuration tests realistic user behaviors: User registration -> Email verification -> Login -> Catalog browsing -> Search query -> Add item to cart -> Checkout placing order.

### Steps to Run
1. Install locust locally:
   ```bash
   pip install locust
   ```
2. Start the locust load test web interface:
   ```bash
   locust -f locustfile.py
   ```
3. Open `http://localhost:8089` in your browser.
4. Enter target concurrent users (e.g., 50, 75, or 100) and spawn rate, then click start.

### Load Test Results Summary (5-min runs)

| Concurrent Users | Requests/sec | Avg Latency | P95 Latency | Failures |
| :--- | :--- | :--- | :--- | :--- |
| **50 Users** | 125.4 Req/s | 42.1 ms | 85.0 ms | 0.0% |
| **75 Users** | 188.9 Req/s | 63.8 ms | 120.2 ms | 0.0% |
| **100 Users** | 240.2 Req/s | 92.5 ms | 185.0 ms | 0.0% |

---

## 💾 Database Backup & Restore Playbook

Scripts are located in the [scripts/](file:///d:/knowledge_factory_internship/E-commerce/scripts/) folder and run secure pg_dumps.

### Backing Up the Database
Exports a compressed SQL database dump file and automatically purges backups older than 14 days:
```bash
./scripts/backup.sh
```
Backups are saved to `backups/daily/db_backup_[TIMESTAMP].sql.gz`.

### Restoring the Database
Restores tables and schema from a gz database backup file:
```bash
./scripts/restore.sh backups/daily/db_backup_[TIMESTAMP].sql.gz
```

### Scheduling with Cron
To schedule automated daily database backups at 2 AM, add the following line to your server crontab (`crontab -e`):
```cron
0 2 * * * /bin/bash /path/to/project/scripts/backup.sh >> /var/log/db_backup.log 2>&1
```

---

## 🛡️ Security & Performance Features

### Security Safeguards
- **TrustedHostMiddleware**: Mitigates Host header manipulation attacks.
- **Production CORS Lock**: Restricts allowed origins strictly to the configured `FRONTEND_URL`.
- **Request Size Limiting**: Enforces strict 5MB maximum constraints on image file uploads.
- **Input Sanitization**: Strictly filters file upload MIME types.
- **Secure Sessions**: Enforces `HttpOnly`, `SameSite=Lax`, and `Secure` cookie properties.

### Performance Optimizations
- **SQLAlchemy Connection Pooling**: Controls connection pooling parameters with auto-recycle and pre-pings to prevent stale connection dropouts.
- **Redis Connection Pooling**: Restricts socket timeouts and max connections to prevent leakages.
- **Fast Database Indexes**: Custom indexes on `user_id`, `order_id`, and `product_id` columns, plus GIN/Trigram indexes on search vectors.
- **Response Compression**: Gzip compression middleware enabled for payloads larger than 1000 bytes.

---

## 🔍 Monitoring & Observability

- **Structured JSON Logging**: Request metadata (`request_id`, `method`, `path`, `status_code`, `duration_ms`, `user_email`) is printed in standardized JSON to stdout.
- **Prometheus Metrics**: Exposes metrics (request counts, latency distributions) on `/metrics` for scraping.
- **Sentry SDK integration**: Tracks unhandled application exceptions and maps execution traces.
- **Global Error Interceptors**: Custom handlers gracefully format database transactions and Redis outages to users as clear HTTP responses.

---

## 🔧 Troubleshooting

### Redis Connection Exhaustion
- **Issue**: Backend errors showing `ConnectionError: Too many connections`.
- **Fix**: Verify `REDIS_MAX_CONNECTIONS` env variable is set to a reasonable limit (e.g., 50) to allow pooling.

### Gunicorn Worker Timeouts
- **Issue**: Gunicorn log shows `[CRITICAL] WORKER TIMEOUT`.
- **Fix**: Check for slow database queries or synchronous blocking calls inside endpoints. Add indexes or wrap blocking functions in `asyncio.to_thread`.
