# LinkSpace Deployment Guide

> **LinkSpace** — Any space is your playground. Every move sparks a connection.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Web App   │────▶│  CloudFront │────▶│   ALB / Nginx   │
│  (React/Vue)│     │     CDN     │     │   (SSL/Rate)    │
└─────────────┘     └─────────────┘     └─────────────────┘
                                                  │
                    ┌─────────────────────────────┘
                    ▼
           ┌─────────────────┐
           │  FastAPI (2x)   │◄── WebSocket /ws/vision/{id}
           │  vision_service │    pose estimation + similarity
           │  pose_similarity│
           └─────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │PostgreSQL│  │ Redis  │  │ Celery │
   │  (RDS) │  │(ElastiCache)│ Workers │
   └────────┘  └────────┘  └────────┘
```

## Quick Start (Local)

### 1. Prerequisites

```bash
# macOS
brew install docker docker-compose

# Ubuntu
curl -fsSL https://get.docker.com | sh
```

### 2. Clone & Configure

```bash
git clone <repo>
cd linkspace-backend

# Create .env
cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql+asyncpg://linkspace:linkspace@db:5432/linkspace
REDIS_URL=redis://redis:6379
EOF
```

### 3. Build & Run

```bash
docker-compose up --build -d

# Scale API to 3 instances
docker-compose up --scale api=3 -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down -v
```

### 4. Verify

```bash
# Health check
curl http://localhost:8000/health

# List game modes
curl http://localhost:8000/games/modes

# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkspace.io","username":"tester","password":"password123"}'
```

## Cloud Deployment

### Option A: AWS ECS Fargate (Recommended for production)

```bash
# 1. Push to ECR
aws ecr create-repository --repository-name linkspace-api
$(aws ecr get-login --no-include-email)
docker build -t linkspace-api .
docker tag linkspace-api:latest <account>.dkr.ecr.<region>.amazonaws.com/linkspace-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/linkspace-api:latest

# 2. Create ECS cluster + Fargate service
# Use AWS Copilot for simplicity:
copilot init --app linkspace --name api --type "Load Balanced Web Service" --dockerfile ./Dockerfile
copilot env init --name prod --profile default
copilot deploy --name api --env prod

# 3. Create RDS PostgreSQL 15 + ElastiCache Redis 7
# Update environment variables in copilot manifest
```

### Option B: Google Cloud Run

```bash
# 1. Build & push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/linkspace-api

# 2. Deploy to Cloud Run
gcloud run deploy linkspace-api \
  --image gcr.io/PROJECT_ID/linkspace-api \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=postgresql+asyncpg://... \
  --memory 2Gi --cpu 2 --concurrency 50 --max-instances 10

# 3. Cloud SQL (PostgreSQL 15) + Memorystore (Redis 7)
```

### Option C: Kubernetes (EKS / GKE / AKS)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linkspace-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: linkspace-api
  template:
    metadata:
      labels:
        app: linkspace-api
    spec:
      containers:
        - name: api
          image: linkspace-api:latest
          ports:
            - containerPort: 8000
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
            requests:
              cpu: "1"
              memory: "1Gi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: linkspace-secrets
                  key: database-url
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: linkspace-secrets
                  key: secret-key
```

```bash
kubectl apply -f k8s/
```

## Environment Variables

| Variable       | Required | Default | Description                        |
| -------------- | -------- | ------- | ---------------------------------- |
| `DATABASE_URL` | Yes      | —       | PostgreSQL async connection string |
| `REDIS_URL`    | Yes      | —       | Redis connection string            |
| `SECRET_KEY`   | Yes      | —       | JWT signing key (min 32 bytes)     |
| `MEDIA_BUCKET` | No       | —       | S3/GCS bucket for replay storage   |
| `SENTRY_DSN`   | No       | —       | Error tracking                     |

## Scaling Strategy

| Component         | Scale Method                    | Target                  |
| ----------------- | ------------------------------- | ----------------------- |
| API containers    | Horizontal (replicas)           | 2–10 based on CPU       |
| PostgreSQL        | Read replicas + connection pool | 20 base + 40 overflow   |
| Redis             | Cluster mode                    | 3 shards                |
| Vision processing | GPU instances (optional)        | NVIDIA T4 for MediaPipe |

## Monitoring

```bash
# Prometheus metrics at /metrics
# Health check at /health
# OpenAPI docs at /docs

# Key metrics to alert on:
# - websocket_connections_active
# - vision_frame_processing_ms_p99
# - pose_detection_failure_rate
# - db_connection_pool_usage
```

## Frontend Integration

The WebSocket vision endpoint expects:

```javascript
const ws = new WebSocket('wss://api.linkspace.io/ws/vision/{client_id}');

// Start session
ws.send(JSON.stringify({
  command: 'start',
  game_mode: 'poomsae',
  reference_sequence: [...]  // Pre-computed landmarks
}));

// Stream frames (binary JPEG)
const canvas = document.getElementById('camera');
const stream = canvas.captureStream(30);
// ... encode frames to JPEG and ws.send(blob)

// Receive results
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'frame_result') {
    // data.similarity_score, data.annotated_frame (base64)
    // data.joint_deviations, data.feedback
  }
};
```

## File Inventory

| File                 | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `main.py`            | FastAPI app — REST + WebSocket             |
| `models.py`          | SQLAlchemy ORM models                      |
| `schemas.py`         | Pydantic request/response validation       |
| `vision_service.py`  | MediaPipe pose estimation + frame encoding |
| `pose_similarity.py` | DTW alignment + cosine similarity scoring  |
| `schema.sql`         | PostgreSQL DDL                             |
| `Dockerfile`         | Container build                            |
| `docker-compose.yml` | Local orchestration                        |
| `requirements.txt`   | Python dependencies                        |
