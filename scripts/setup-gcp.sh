#!/bin/bash

# GCP Setup Script for Code Playground
set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
CLUSTER_NAME=${CLUSTER_NAME:-"playground-cluster"}
REGION=${REGION:-"us-central1"}
MACHINE_TYPE=${MACHINE_TYPE:-"e2-standard-4"}
NUM_NODES=${NUM_NODES:-"3"}

echo "🚀 Setting up GCP infrastructure for Code Playground..."
echo "Project ID: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable container.googleapis.com
gcloud services enable cloudsql.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com

# Set the project
gcloud config set project $PROJECT_ID

# Create GKE cluster
echo "🏗️ Creating GKE cluster..."
gcloud container clusters create $CLUSTER_NAME \
  --region $REGION \
  --machine-type $MACHINE_TYPE \
  --num-nodes $NUM_NODES \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --enable-network-policy \
  --enable-ip-alias \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --disk-size 50GB \
  --disk-type pd-ssd

# Get cluster credentials
echo "🔗 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Create static IP address
echo "🌐 Creating static IP address..."
gcloud compute addresses create playground-ip --global

# Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL instance..."
gcloud sql instances create playground-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase

# Create database and user
echo "👤 Creating database and user..."
gcloud sql databases create playgrounds --instance=playground-db
gcloud sql users create playground --instance=playground-db --password=your-secure-password

# Create Redis instance
echo "📦 Creating Redis instance..."
gcloud redis instances create playground-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_6_x

# Create service account
echo "🔐 Creating service account..."
gcloud iam service-accounts create playground-service \
  --display-name="Code Playground Service Account"

# Grant necessary permissions
echo "🛡️ Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:playground-service@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:playground-service@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:playground-service@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/redis.editor"

# Create service account key
echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create ./service-account-key.json \
  --iam-account=playground-service@$PROJECT_ID.iam.gserviceaccount.com

# Install necessary tools
echo "🛠️ Installing kubectl and other tools..."
gcloud components install kubectl

echo "✅ GCP setup completed successfully!"
echo ""
echo "📋 Created resources:"
echo "  - GKE Cluster: $CLUSTER_NAME"
echo "  - Cloud SQL Instance: playground-db"
echo "  - Redis Instance: playground-redis"
echo "  - Static IP: playground-ip"
echo "  - Service Account: playground-service"
echo ""
echo "🔧 Next steps:"
echo "  1. Update your .env.production file with the actual connection details"
echo "  2. Update k8s/secret.yaml with base64 encoded secrets"
echo "  3. Run './scripts/deploy-gke.sh' to deploy the application"
echo ""
echo "📝 Important notes:"
echo "  - Service account key saved to: ./service-account-key.json"
echo "  - Keep this file secure and don't commit it to version control"
echo "  - Update the database password in the secrets"