#!/bin/bash
# Quick start script to set up and run the churn prediction pipeline

set -e

echo "🚀 Setting up Fintech Churn Prediction Pipeline..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Generate sample data
echo "Generating sample data..."
python scripts/generate_sample_data.py

# Train model
echo "Training model..."
python src/train.py

echo "✅ Setup complete!"
echo ""
echo "To start the API server, run:"
echo "  python src/api.py"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up -d"
echo ""
echo "To view MLflow UI:"
echo "  mlflow ui --backend-store-uri file:///mlruns"

