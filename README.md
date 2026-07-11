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

## 🚀 Quick Start (Local Setup)

The easiest way to boot the complete environment (Postgres, Redis, Backend, Workers, Beat, and Frontend) is via Docker Compose.

### Option A: Using Docker Compose (Recommended)
1. Clone the repository and run:
   ```bash
   docker-compose up --build
   ```
2. The React client will be available at [http://localhost](http://localhost) (mapped to port 80).
3. The FastAPI interactive Swagger API will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

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
