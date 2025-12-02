#!/bin/bash
# AWS deployment script for churn prediction service

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPOSITORY=${ECR_REPOSITORY:-fintech-churn-prediction}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Deploying to AWS ECR and ECS..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION || \
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# Build and push Docker image
ECR_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY

echo "Building Docker image..."
docker build -t $ECR_REPOSITORY:latest .

echo "Tagging image..."
docker tag $ECR_REPOSITORY:latest $ECR_URI:latest

echo "Pushing image to ECR..."
docker push $ECR_URI:latest

echo "Deployment complete!"
echo "Image URI: $ECR_URI:latest"
echo ""
echo "To deploy to ECS, create a task definition and service using this image."
echo "You can also use AWS App Runner or Elastic Beanstalk for easier deployment."

