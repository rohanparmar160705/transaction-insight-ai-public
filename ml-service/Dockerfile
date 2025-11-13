# Multi-stage Dockerfile for ML Service
# ======================================
#
# What is a multi-stage build?
# ----------------------------
# Uses multiple FROM statements to create smaller, more secure images.
# - Stage 1 (builder): Install dependencies, train model
# - Stage 2 (production): Copy only what's needed to run
#
# Benefits:
# - Smaller image size (no build tools in final image)
# - More secure (fewer packages = smaller attack surface)
# - Faster deployments

# ============================================================================
# Stage 1: Builder - Install dependencies and train model
# ============================================================================

FROM python:3.11-slim AS builder

# Set working directory
# All subsequent commands run in this directory
WORKDIR /app

# Install system dependencies needed for building Python packages
# gcc, g++: Compilers for native extensions (numpy, scikit-learn)
# --no-install-recommends: Minimizes installed packages
# rm -rf /var/lib/apt/lists/*: Cleans up to reduce image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first (Docker layer caching optimization)
# Why copy requirements separately?
# - Docker caches layers. If requirements.txt doesn't change,
#   Docker reuses the cached layer (faster builds!)
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir: Don't save pip cache (reduces image size)
# --user: Install in user directory (safer)
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY . .

# Train the model during build
# This ensures the model is always fresh and included in the image
RUN python train_model.py

# ============================================================================
# Stage 2: Production - Minimal runtime image
# ============================================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Create non-root user for security
# Why non-root?
# - Root user has full system access (security risk)
# - Best practice: run as non-privileged user
RUN groupadd -r mlservice && \
    useradd -r -g mlservice mlservice

# Copy Python packages from builder stage
# --from=builder: Copy from previous stage
# This gives us installed packages without build tools
COPY --from=builder /root/.local /root/.local

# Copy application files from builder
COPY --from=builder /app/app.py .
COPY --from=builder /app/schemas.py .
COPY --from=builder /app/utils.py .
COPY --from=builder /app/model.joblib .

# Make sure scripts are in PATH
ENV PATH=/root/.local/bin:$PATH

# Environment variables
# These can be overridden at runtime
ENV PORT=8000
ENV HOST=0.0.0.0
ENV MODEL_PATH=/app/model.joblib

# Switch to non-root user
USER mlservice

# Expose port
# This documents which port the container listens on
# (doesn't actually publish the port - use -p flag for that)
EXPOSE 8000

# Health check
# Docker periodically runs this to check container health
# --interval: How often to check
# --timeout: How long to wait for response
# --start-period: Grace period after container starts
# --retries: How many failures before marking unhealthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start the application
# CMD: Default command when container starts
# Can be overridden with 'docker run <image> <different-command>'
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# ============================================================================
# Build and Run Instructions
# ============================================================================
#
# Build image:
#   docker build -t transaction-ml-service .
#
# Run container:
#   docker run -p 8000:8000 transaction-ml-service
#
# Run with environment variables:
#   docker run -p 8000:8000 -e PORT=8080 transaction-ml-service
#
# Run with volume (for model updates without rebuild):
#   docker run -p 8000:8000 -v $(pwd)/model.joblib:/app/model.joblib transaction-ml-service
#
# Check logs:
#   docker logs <container-id>
#
# Access interactive shell:
#   docker exec -it <container-id> /bin/bash