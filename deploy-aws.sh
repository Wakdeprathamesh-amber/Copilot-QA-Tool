#!/bin/bash

# AWS Production Deployment Script for AI Eval Console
# This script handles the complete deployment process on AWS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ai-eval-console"
DOCKER_REGISTRY="your-account-id.dkr.ecr.us-east-1.amazonaws.com"
AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="ai-eval-cluster"
ECS_SERVICE_NAME="ai-eval-service"

echo -e "${BLUE}🚀 Starting AWS deployment for AI Eval Console${NC}"
echo "=================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_status "All dependencies are installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.production .env
        print_error "Please edit .env file with your actual values before continuing"
        exit 1
    fi
    print_status "Environment file found"
}

# Build Docker images
build_images() {
    echo -e "${BLUE}Building Docker images...${NC}"
    
    # Build frontend
    echo "Building frontend image..."
    docker build -f Dockerfile.frontend -t ${APP_NAME}-frontend:latest .
    
    # Build backend
    echo "Building backend image..."
    docker build -f Dockerfile.backend -t ${APP_NAME}-backend:latest .
    
    print_status "All images built successfully"
}

# Tag and push images to ECR
push_to_ecr() {
    echo -e "${BLUE}Pushing images to ECR...${NC}"
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
    
    # Create repositories if they don't exist
    aws ecr describe-repositories --repository-names ${APP_NAME}-frontend --region ${AWS_REGION} || \
        aws ecr create-repository --repository-name ${APP_NAME}-frontend --region ${AWS_REGION}
    
    aws ecr describe-repositories --repository-names ${APP_NAME}-backend --region ${AWS_REGION} || \
        aws ecr create-repository --repository-name ${APP_NAME}-backend --region ${AWS_REGION}
    
    # Tag and push images
    docker tag ${APP_NAME}-frontend:latest ${DOCKER_REGISTRY}/${APP_NAME}-frontend:latest
    docker tag ${APP_NAME}-backend:latest ${DOCKER_REGISTRY}/${APP_NAME}-backend:latest
    
    docker push ${DOCKER_REGISTRY}/${APP_NAME}-frontend:latest
    docker push ${DOCKER_REGISTRY}/${APP_NAME}-backend:latest
    
    print_status "Images pushed to ECR successfully"
}

# Deploy using ECS (if using ECS)
deploy_ecs() {
    echo -e "${BLUE}Deploying to ECS...${NC}"
    
    # Update ECS service (assumes task definition exists)
    aws ecs update-service \
        --cluster ${ECS_CLUSTER_NAME} \
        --service ${ECS_SERVICE_NAME} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    print_status "ECS deployment initiated"
}

# Deploy using Docker Compose (for EC2 instances)
deploy_docker_compose() {
    echo -e "${BLUE}Deploying with Docker Compose...${NC}"
    
    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down
    
    # Pull latest images and start
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Docker Compose deployment completed"
}

# Health check
health_check() {
    echo -e "${BLUE}Performing health check...${NC}"
    
    # Wait for services to start
    sleep 30
    
    # Check if services are responding
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Backend health check passed"
    else
        print_warning "Backend health check failed"
    fi
}

# Cleanup old images
cleanup() {
    echo -e "${BLUE}Cleaning up old images...${NC}"
    docker image prune -f
    print_status "Cleanup completed"
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_dependencies
    check_env_file
    build_images
    
    # Ask user for deployment method
    echo -e "${YELLOW}Choose deployment method:${NC}"
    echo "1) Docker Compose (EC2/Local)"
    echo "2) ECR + ECS"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            deploy_docker_compose
            health_check
            ;;
        2)
            push_to_ecr
            deploy_ecs
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    cleanup
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo "=================================================="
    echo -e "${BLUE}Access your application at:${NC}"
    echo "Frontend: http://your-domain-or-ip"
    echo "Backend API: http://your-domain-or-ip/api"
    echo "Health Check: http://your-domain-or-ip/health"
}

# Run main function
main "$@"