# ==============================================================================
# GRAYLINE - Multi-Stage Container Build
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime Backend & Static Serving
FROM python:3.10-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY .env.example .

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

# Entrypoint runs migrations and starts uvicorn server
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
