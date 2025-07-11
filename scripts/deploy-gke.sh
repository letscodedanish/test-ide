#!/bin/bash

# GKE Deployment Script for Code Playground
set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
CLUSTER_NAME=${CLUSTER_NAME:-"playground-cluster"}
REGION=${REGION:-"us-central1"}
NAMESPACE="code-playground"

echo "🚀 Starting deployment to GKE..."
echo "Project ID: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth configure-docker

# Set the project
gcloud config set project $PROJECT_ID

# Get GKE credentials
echo "🔗 Getting GKE credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Build and push Docker images
echo "🐳 Building and pushing Docker images..."

# Build main application
docker build -t gcr.io/$PROJECT_ID/playground-app:latest .
docker push gcr.io/$PROJECT_ID/playground-app:latest

# Build playground runtime
docker build -f Dockerfile.playground -t gcr.io/$PROJECT_ID/playground-runtime:latest .
docker push gcr.io/$PROJECT_ID/playground-runtime:latest

# Update Kubernetes manifests with project ID
echo "📝 Updating Kubernetes manifests..."
find k8s/ -name "*.yaml" -exec sed -i "s/PROJECT_ID/$PROJECT_ID/g" {} \;

# Apply Kubernetes manifests
echo "⚙️ Applying Kubernetes manifests..."

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations and secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy database and Redis
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

# Deploy application and runtime
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/playground-runtime.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/playground-app -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=available deployment/playground-runtime -n $NAMESPACE --timeout=300s

# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Get the external IP
echo "🌐 Getting external IP address..."
EXTERNAL_IP=$(kubectl get ingress playground-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$EXTERNAL_IP" ]; then
  echo "⏳ Waiting for external IP to be assigned..."
  kubectl get ingress playground-ingress -n $NAMESPACE -w &
  wait_pid=$!
  
  # Wait up to 10 minutes for IP assignment
  timeout=600
  while [ $timeout -gt 0 ] && [ -z "$EXTERNAL_IP" ]; do
    sleep 10
    EXTERNAL_IP=$(kubectl get ingress playground-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    timeout=$((timeout - 10))
  done
  
  kill $wait_pid 2>/dev/null || true
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  Application URL: http://$EXTERNAL_IP"
echo "  Namespace: $NAMESPACE"
echo "  Cluster: $CLUSTER_NAME"
echo "  Region: $REGION"
echo ""
echo "🔧 Useful commands:"
echo "  View pods: kubectl get pods -n $NAMESPACE"
echo "  View services: kubectl get services -n $NAMESPACE"
echo "  View logs: kubectl logs deployment/playground-app -n $NAMESPACE"
echo "  Port forward: kubectl port-forward service/playground-service 3000:80 -n $NAMESPACE"
echo ""
echo "📝 Next steps:"
echo "  1. Configure your domain DNS to point to: $EXTERNAL_IP"
echo "  2. Update the SSL certificate domains in k8s/ingress.yaml"
echo "  3. Configure monitoring and alerting"