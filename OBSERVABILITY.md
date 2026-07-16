# ShopHub Observability & Monitoring Guide

This document outlines the structured logging, error tracking, and performance metrics setup implemented for production-grade observability.

---

## 1. Structured Logging (structlog)
All application logs, standard library logs, and Uvicorn server access logs are captured, formatted, and written to standard output (`stdout`).

### Configuration Settings
- `LOG_FORMAT`: Set to `json` (default) for JSON output, or `console` for pretty-printed colors during local development.
- **Production Compatibility**: The JSON format prints logs as single-line JSON structures. This is fully compatible with log aggregators such as **AWS CloudWatch**, **Datadog**, and **Grafana Loki**.

### Example Log output (JSON):
```json
{"event": "User login successful", "level": "info", "logger": "app", "timestamp": "2026-07-16T14:40:00.123456Z", "user_id": 4}
{"event": "GET /products HTTP/1.1 200", "level": "info", "logger": "uvicorn.access", "timestamp": "2026-07-16T14:40:02.987654Z"}
```

---

## 2. Error Tracking & APM (Sentry)
Sentry is integrated natively into the FastAPI application lifecycle to capture unhandled exceptions, trace database queries, and measure performance metrics.

### Configuration Settings
- `SENTRY_DSN`: The Sentry Data Source Name (DSN) url. Leave empty to disable Sentry tracking.
- `ENVIRONMENT`: Set to `production` or `development` to segment Sentry issues.
- **Auto-Instrumentation**:
  - Automatically captures all HTTP 500 exceptions and unhandled system failures.
  - Instruments SQLAlchemy to trace slow database queries.
  - Traces profile executions with a 100% sample rate (`traces_sample_rate=1.0`) to provide complete flame graphs in the Sentry APM dashboard.

---

## 3. Prometheus Application Metrics
Application performance indicators and service health are exposed via a Prometheus scraper endpoint.

### Scraper Endpoint
- **Metrics URL**: `/metrics`
- **Toggle Setting**: `PROMETHEUS_METRICS_ENABLED=true` (set to `false` to disable instrumentation).

### Key Metrics Tracked:
1. **Request Count**: `http_requests_total` (tracks total volume split by HTTP method, handler path, and status code).
2. **Response Time**: `http_request_duration_seconds` (histogram detailing request latency percentiles: 50th, 90th, 99th).
3. **Error Rate**: Calculated dynamically in Prometheus from `http_requests_total` where `status >= 500`.

---

## 4. Uptime & Health Check Monitoring (UptimeRobot)
The `/health` endpoint is designed to verify the status of crucial system dependencies:
- **Checks**:
  - PostgreSQL Database (runs `SELECT 1` query).
  - Redis Cache & Broker (runs a `ping()` check).
- **Status Codes**:
  - `200 OK`: If both database and cache are responsive.
  - `503 Service Unavailable`: If either PostgreSQL or Redis goes down.
- **Compatibility**: Perfect for **UptimeRobot** or AWS Route53 health checks to trigger failover alerts.

---

## 5. Local Verification & Testing

### How to verify logs format:
Run the backend server:
```bash
uvicorn app.main:app --reload
```
Trigger any action (e.g. `/health` or `/products`) and verify the stdout terminal shows JSON-formatted single-line logs.

### How to inspect Prometheus metrics:
Submit an HTTP GET request to:
`http://localhost:8000/metrics`
Verify that it lists prometheus standard metrics (e.g., `# HELP http_requests_total`, `http_requests_total`).

### How to test UptimeRobot health check:
Submit an HTTP GET request to:
`http://localhost:8000/health`
Verify it returns status code `200` with JSON detailing component health. To simulate failure, stop your local Redis server and verify it immediately returns `503`.
