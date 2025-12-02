#!/bin/bash
# Azure deployment script for churn prediction service

set -e

# Configuration
RESOURCE_GROUP=${RESOURCE_GROUP:-fintech-ml-rg}
CONTAINER_REGISTRY=${CONTAINER_REGISTRY:-fintechmlregistry}
LOCATION=${LOCATION:-eastus}
APP_NAME=${APP_NAME:-churn-prediction-api}

echo "Deploying to Azure Container Registry and App Service..."

# Login to Azure (if not already logged in)
az account show || az login

# Create resource group if it doesn't exist
az group create --name $RESOURCE_GROUP --location $LOCATION || true

# Create Azure Container Registry if it doesn't exist
az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic || true

# Login to ACR
az acr login --name $CONTAINER_REGISTRY

# Build and push Docker image
ACR_URI=$CONTAINER_REGISTRY.azurecr.io

echo "Building Docker image..."
docker build -t $ACR_URI/$APP_NAME:latest .

echo "Pushing image to ACR..."
docker push $ACR_URI/$APP_NAME:latest

# Create App Service plan (if needed)
APP_SERVICE_PLAN="${APP_NAME}-plan"
az appservice plan create --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --is-linux --sku B1 || true

# Create Web App
az webapp create --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --name $APP_NAME --deployment-container-image-name $ACR_URI/$APP_NAME:latest || true

# Configure Web App to use ACR
az webapp config container set --name $APP_NAME --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_URI/$APP_NAME:latest \
    --docker-registry-server-url https://$ACR_URI \
    --docker-registry-server-user $(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv) \
    --docker-registry-server-password $(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value -o tsv)

echo "Deployment complete!"
echo "Web App URL: https://$APP_NAME.azurewebsites.net"

