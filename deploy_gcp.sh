#!/usr/bin/env bash
set -euo pipefail

# One-Command Google Cloud Run Deployment for Sevak's Minecraft World
# Usage: ./deploy_gcp.sh [GCP_PROJECT_ID]

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: ./deploy_gcp.sh <GCP_PROJECT_ID>"
  exit 1
fi

echo "🚀 Deploying Sevak's Minecraft World to Google Cloud Run (Project: $PROJECT_ID)..."
gcloud run deploy sevaks-minecraft-world \
  --source . \
  --project "$PROJECT_ID" \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
