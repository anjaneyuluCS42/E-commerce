# 🛒 ShopHub - Full-Stack AI-Powered E-Commerce Platform

ShopHub is a production-grade, full-stack e-commerce application modeled after real-time giants like Amazon and Flipkart. It features a modern React Single Page Application (SPA), a high-concurrency async FastAPI backend, real-time customer support WebSockets, distributed Celery task queues, and an intelligent AI Shopping Assistant powered by LLMs with multi-provider fallback logic.

---

## ⚡ Tech Stack & Badges

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DD0031?style=for-the-badge&logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🌟 Key Features

* **🤖 AI Shopping Assistant (RAG Engine)**: Chat with an AI assistant that extracts budget/brand/specs (RAM, Storage, Battery, Gaming) via NLP, performs local PostgreSQL vector search & ranking, and streams recommendations using Server-Sent Events (SSE).
* **💬 Real-Time Live Support (WebSockets)**: Continuous duplex channel for client-to-admin support chat, notification overlays, and typing status indicators with a connection heartbeat.
* **📬 Distributed Tasks (Celery & Redis)**: Offloads heavy computation from main API loops into prioritized queues (e.g. instant email dispatch, asynchronous PDF invoice generation via ReportLab, and bulk catalog CSV imports).
* **🔍 Search Engine Optimization**: PostgreSQL weighted `TSVECTOR` Full-Text Search and Trigram index (`pg_trgm`) for fuzzy search logic (autocorrecting misspelled product words).
* **🛡️ Security & Rate Limiting**: Token-based JWT authorization in headers & HTTP-only cookies, SlowAPI rate-limiting on LLM routes, and secure CORS policy protection.
* **💤 Render Free-Tier Keep-Alive**: Centralized base URL swappers and 90s Axios timeouts combined with automated external keep-alive cronjobs to prevent cold starts.

---

## 📁 Repository Structure

```text
E-commerce/
├── Backend/                 # FastAPI Application Source Code
│   ├── app/
│   │   ├── auth/           # OAuth2 & JWT Security handlers
│   │   ├── cache/          # Async Redis Client configurations
│   │   ├── models/         # SQLAlchemy Database models
│   │   ├── routers/        # API Controller routes (Products, Orders, AI, WS)
│   │   ├── security/       # SlowAPI Limiter integrations
│   │   ├── services/       # Core business logic (RAG Search, PDF generator)
│   │   └── tasks/          # Celery background tasks & celery worker setup
│   ├── Dockerfile
│   ├── requirements.txt
│   └── seed_db.py          # Data seeding script (Preloads 120 products)
├── Frontend/                # React SPA Application Source Code
│   ├── src/
│   │   ├── api/            # Centralized Axios client & interceptors
│   │   ├── components/     # UI elements (Cards, Skeletons, Chatbot)
│   │   ├── context/        # WebSockets state provider
│   │   ├── pages/          # Router screens (Home, Products, Admin, Support)
│   │   └── store/          # Zustand global state (Cart, Toast alerts)
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml       # Multi-container local orchestration script
└── DOCUMENTATION.md        # Technical System Specifications
```

---

## 🐳 Docker Deployment & Orchestration Guide

This section explains how to get the entire full-stack application up and running locally in isolated containers using Docker.

### 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
* **Git**: To clone the project repository.
* **Docker Desktop**: The daemon engine used to run containers.

---

### 💿 Docker Desktop Installation

Depending on your Operating System, download and install Docker Desktop:

* **Windows**: Download the installer from the [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) portal. Ensure **WSL 2 (Windows Subsystem for Linux)** is enabled on your machine and selected during the installation.
* **macOS**: Download from [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) (select Intel or Apple Silicon based on your processor).
* **Linux**: Follow the guide for your distribution at [Docker Engine Installation](https://docs.docker.com/engine/install/).

*Once installed, open Docker Desktop to verify the service daemon is actively running.*

---

### 🚀 Getting Started (Step-by-Step)

#### 1. Clone the Repository
Open a terminal (or PowerShell on Windows) and clone the repository:
```bash
git clone https://github.com/anjaneuyuluCS42/E-commerce.git
cd E-commerce
```

#### 2. Configure Environment Variables
Copy or create a `.env` configuration at the root of the repository:
```bash
cp .env.example .env
```
*(Refer to the root [.env](file:///d:/knowledge_factory_internship/E-commerce/.env) file to configure database credentials, ports, and API keys).*

#### 3. Build and Run everything
To build the Docker images and start all six services in the foreground, run:
```bash
docker compose up --build
```
*Alternatively, you can run in detached mode (background) by adding the `-d` flag:*
```bash
docker compose up --build -d
```

---

### 🌐 Accessing the Application

Once all health checks pass and containers show `healthy` (`docker compose ps`), open your web browser:
* **React Frontend SPA**: Accessible at [http://localhost](http://localhost) (Port `80`).
* **FastAPI Backend (Interactive Swagger Docs)**: Accessible at [http://localhost:8000/docs](http://localhost:8000/docs) (Port `8000`).

---

### ⚙️ Managing the Container Lifecycle

#### Stop Containers (Keep Data)
To halt all running containers without destroying database volumes or caches:
```bash
docker compose stop
```

#### Start Containers (Stopped State)
To resume execution of previously stopped containers:
```bash
docker compose start
```

#### Stop and Remove Containers (Keep Volume Data)
To stop running containers and remove networks and container states (keeps database files safe):
```bash
docker compose down
```

#### Stop and Remove Everything (Delete Volume Data)
To reset the environment completely by wiping container volumes, networks, and persistent databases:
```bash
docker compose down -v
```

#### Rebuild Containers
If you modify configuration files (such as `package.json`, `requirements.txt`, or the Dockerfiles themselves) and want to force a clean dependency build:
```bash
docker compose build --no-cache
docker compose up --build -d
```

#### View Application Logs
To stream combined logs from all active services:
```bash
docker compose logs -f
```
To view logs for a specific service (e.g. only the backend api):
```bash
docker compose logs -f backend
```

---

### 🛠️ Useful Docker CLI Commands

| Action | Command |
| :--- | :--- |
| **List Running Services** | `docker compose ps` |
| **List Available Images** | `docker images` |
| **Check System Resource Usage** | `docker stats` |
| **Clean Up Unused Container Cache** | `docker system prune -a --volumes` |
| **Open Interactive Shell inside Container** | `docker compose exec backend sh` |

---

### Option B: Manual Setup

#### 1. Backend Setup
1. Navigate into the Backend folder:
   ```bash
   cd Backend
   ```
2. Create a virtual environment and install requirements:
   ```bash
   python -m venv venv
   source venv/Scripts/activate # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up environment variables in a `.env` file (referencing DB_URL and REDIS_URL).
4. Run migrations and database seeding:
   ```bash
   python seed_db.py
   ```
5. Start the API server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### 2. Celery Workers Setup
Launch the background queues (requires Redis running locally):
* **High Priority Queue** (Emails):
  ```bash
  celery -A app.tasks.celery_worker.celery worker -Q high_priority --loglevel=info
  ```
* **Default/Low Priority Queue** (PDFs & CSVs):
  ```bash
  celery -A app.tasks.celery_worker.celery worker -Q default,low_priority --loglevel=info
  ```

#### 3. Frontend Setup
1. Navigate into the Frontend folder:
   ```bash
   cd ../Frontend
   ```
2. Install dependency files:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the client application at [http://localhost:5173](http://localhost:5173).

---

## 🔑 Seeding & Default Credentials

After running `python seed_db.py` (which populates **120 products** across 6 categories), you can log in using these preloaded admin credentials:

* **Email**: `anji@gmail.com`
* **Password**: `123456`
* **Role**: `admin` (Has privileges to update stock, import products CSV, and access the customer support portal).

---

## 📖 Deep Architectural Details

For a granular walkthrough of components, optimization strategies (SQL indices, WebSocket heartbeat, LLM fallback pipeline, caching mechanisms, rate limit configurations), please see the comprehensive technical [DOCUMENTATION.md](file:///d:/knowledge_factory_internship/E-commerce/DOCUMENTATION.md) file.
