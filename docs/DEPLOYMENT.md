# Deployment Guide - Google Cloud Platform (Cloud Run - FREE)

This guide deploys "Shadows of Judgment" to **Google Cloud Run**, which has a generous **always-free tier**.

## Free Tier Limits (per month)

| Resource | Free Allowance |
|----------|---------------|
| Requests | 2 million |
| Compute (GB-seconds) | 360,000 |
| Compute (vCPU-seconds) | 180,000 |
| Network egress | 1 GiB (North America) |
| Cloud Build | 120 build-minutes/day |

For a small game, you will likely **never exceed these limits**.

## Prerequisites

1. **Google Cloud Account**: Create one at [cloud.google.com](https://cloud.google.com) (free, no credit card required for free tier)
2. **Google Cloud SDK**: Install the gcloud CLI
   ```bash
   # Linux/macOS
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```
3. **Node.js 20+**

## Initial GCP Setup (One-Time)

### 1. Create a GCP Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create YOUR-PROJECT-ID --name="Shadows of Judgment"

# Set as default project
gcloud config set project YOUR-PROJECT-ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### 3. Enable Billing

Cloud Run free tier requires billing to be enabled, but **you won't be charged** if you stay within free tier limits. You can set budget alerts at $0 for safety.

```bash
# Set a budget alert (optional, via console)
# Go to: https://console.cloud.google.com/billing/budgets
```

## Deploy

### Option 1: One-Command Deploy (Recommended)

```bash
./deploy.sh
```

### Option 2: npm script

```bash
npm run deploy
```

### Option 3: Manual

```bash
gcloud run deploy shadows-of-judgment \
    --source . \
    --region europe-west1 \
    --allow-unauthenticated \
    --session-affinity \
    --min-instances 0 \
    --max-instances 1 \
    --memory 256Mi \
    --cpu 1 \
    --port 8080
```

First deploy takes ~5 minutes. Subsequent deploys are faster.

## After Deployment

### Get your URL

```bash
gcloud run services describe shadows-of-judgment --region europe-west1 --format="value(status.url)"
```

Your app will be at: `https://shadows-of-judgment-XXXXXX-ew.a.run.app`

### View Logs

```bash
# Last 50 log entries
npm run deploy:logs

# Stream logs in real-time
gcloud run services logs tail shadows-of-judgment --region europe-west1
```

## Key Configuration Choices (for staying free)

| Setting | Value | Why |
|---------|-------|-----|
| `min-instances` | 0 | Scales to zero when idle (no cost) |
| `max-instances` | 1 | Single instance, caps compute to minimum |
| `memory` | 256Mi | Minimum needed, saves GB-seconds |
| `cpu` | 1 | Standard allocation |
| `session-affinity` | enabled | WebSocket connections stay on same instance |

## Local Testing (Production Mode)

```bash
# Build the client
npm run build

# Copy dist into server for local prod test
cp -r dist/ server/dist/

# Run in production mode
cd server && NODE_ENV=production PORT=8080 node index.js

# Open http://localhost:8080
```

Or test with Docker:

```bash
docker build -t shadows-of-judgment .
docker run -p 8080:8080 shadows-of-judgment
# Open http://localhost:8080
```

## Custom Domain (Optional, Free)

```bash
gcloud run domain-mappings create \
    --service shadows-of-judgment \
    --domain yourdomain.com \
    --region europe-west1
```

## Updating the App

Just re-run the deploy command — Cloud Run handles rolling updates automatically:

```bash
npm run deploy
# or
./deploy.sh
```

## Harness Production CD Delegate

Harness production CD uses the Docker Delegate running on the local machine. Keeping it local avoids an always-on cloud VM, but it must be running and eligible when the production CD stage fetches artifacts and runs its deployment steps. PR validation skips production approval and CD, so it does not require the delegate.

The CD shell steps require Bash, `curl`, `awk`, and Python 3 (standard library only). They download the Google Cloud CLI when `gcloud` is not already installed. The image verification reads the OCI index to confirm Cloud Run's `linux/amd64` digest belongs to the immutable CI image.

Before approving a production deployment:

1. List Docker containers and identify the Harness Delegate container:

    ```bash
    docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'
    ```

2. Start it if stopped, or restart it if Docker reports it as unhealthy:

    ```bash
    docker start <delegate-container-id>
    # If it is already running but unhealthy:
    docker restart <delegate-container-id>
    ```

3. Confirm Docker reports it as `running healthy`:

    ```bash
    docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' <delegate-container-id>
    ```

4. In the project's **Delegates** page, confirm the delegate is **Connected**, has a recent heartbeat, and has the `docker-delegate` selector used by the deployment shell steps. A project-scoped delegate may not appear in the account-level Delegates list; check the scope where it was installed.

For a first-time project-scoped install, open **Project Settings > Project-level resources > Delegates**, select **New Delegate**, and choose **Docker**. Run the generated command on the local machine; keep its delegate token out of Git and chat. If Docker reports the container healthy but the project-level Delegates page has no connected delegate, install it at the project scope with a fresh generated command rather than reusing an old token or hand-building a command. An empty account-level list alone does not mean the project delegate is missing.

Keep the delegate running until the production CD execution completes. Afterward, stop it when it is not needed:

```bash
docker stop <delegate-container-id>
```

## Deleting the Service

```bash
gcloud run services delete shadows-of-judgment --region europe-west1
```

## Troubleshooting

### Cold Starts
With `min-instances=0`, the first request after idle may take 2-3 seconds. This is normal and expected for the free tier.

### WebSocket Disconnects
`--session-affinity` ensures clients stick to their instance. If you still see disconnects, `max-instances` is already at 1, so all connections go to the same instance.

### 502 / Container Fails to Start
```bash
# Check build & startup logs
gcloud run services logs read shadows-of-judgment --region europe-west1 --limit 100
```

### Exceeded Free Tier?
Set a budget alert at $1 to catch any unexpected charges:
```bash
# Via console: https://console.cloud.google.com/billing/budgets
```

## Quick Reference

```bash
# Deploy
npm run deploy

# Logs
npm run deploy:logs

# Get URL
gcloud run services describe shadows-of-judgment --region europe-west1 --format="value(status.url)"

# Delete (stop all costs)
gcloud run services delete shadows-of-judgment --region europe-west1
```
