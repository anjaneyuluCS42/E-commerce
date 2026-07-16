import multiprocessing
import os

# Socket binding
bind = f"0.0.0.0:{os.getenv('BACKEND_PORT', '8000')}"

# Worker processes configuration
# Using (2 * cores) + 1 formula for optimal resource usage
workers = (multiprocessing.cpu_count() * 2) + 1
worker_class = "uvicorn.workers.UvicornWorker"

# Worker execution bounds
timeout = 120
keepalive = 5

# Prevent memory leaks by restarting workers after a set number of requests
max_requests = 1000
max_requests_jitter = 50

# Logging
loglevel = "info"
accesslog = "-"
errorlog = "-"
