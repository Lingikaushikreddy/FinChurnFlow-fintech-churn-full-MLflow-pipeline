# Fintech Churn Prediction Pipeline

An end-to-end machine learning pipeline for predicting customer churn on a fintech platform. This project includes data processing with pandas/polars, model training with LightGBM/CatBoost, experiment tracking with MLflow, API serving with FastAPI, and Docker deployment to AWS or Azure.

## Features

- **Data Processing**: Clean and preprocess data using pandas or polars
- **Model Training**: Train churn prediction models with LightGBM or CatBoost
- **Experiment Tracking**: Track experiments, metrics, and models with MLflow
- **API Service**: Serve predictions via FastAPI REST API
- **Docker Support**: Containerized application for easy deployment
- **Cloud Deployment**: Ready for deployment on AWS (ECS/ECR) or Azure (App Service/ACR)

## Project Structure

```
.
├── src/
│   ├── __init__.py
│   ├── data_processing.py    # Data cleaning and preprocessing
│   ├── train.py              # Model training with MLflow
│   └── api.py                # FastAPI service
├── scripts/
│   ├── generate_sample_data.py  # Generate sample data
│   ├── deploy_aws.sh            # AWS deployment script
│   └── deploy_azure.sh          # Azure deployment script
├── data/
│   ├── raw/                     # Raw data directory
│   └── processed/               # Processed data directory
├── models/                      # Trained models directory
├── mlruns/                      # MLflow experiment tracking
├── aws-deployment/              # AWS deployment configs
├── azure-deployment/            # Azure deployment configs
├── config.yaml                  # Configuration file
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker image definition
├── docker-compose.yml           # Docker Compose configuration
└── README.md                    # This file
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Generate Sample Data

Generate sample customer data for testing:

```bash
python scripts/generate_sample_data.py
```

This will create `data/raw/customer_data.csv` with sample fintech customer data.

### 3. Configure Settings

Edit `config.yaml` to customize:
- Model type (LightGBM or CatBoost)
- Model hyperparameters
- MLflow tracking URI
- API settings
- Deployment configurations

## Usage

### Training the Model

Train a churn prediction model:

```bash
python src/train.py
```

This will:
1. Load and clean the data
2. Split into train/validation/test sets
3. Train the model (LightGBM or CatBoost based on config)
4. Evaluate the model
5. Log everything to MLflow
6. Save the trained model

### Starting MLflow UI

View experiment results:

```bash
mlflow ui --backend-store-uri file:///mlruns --default-artifact-root file:///mlruns
```

Then open http://localhost:5000 in your browser.

### Running the API

Start the FastAPI service:

```bash
python src/api.py
```

Or using uvicorn directly:

```bash
uvicorn src.api:app --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

### API Endpoints

- `GET /` - Health check
- `GET /health` - Health check with model status
- `POST /predict` - Predict churn for a single customer
- `POST /predict_batch` - Predict churn for multiple customers

#### Example Request

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "account_age_days": 180,
    "transaction_count": 45,
    "avg_transaction_amount": 125.50,
    "login_frequency": 3.5,
    "support_tickets": 2,
    "payment_method": "credit_card",
    "subscription_type": "premium",
    "account_balance": 5000.00
  }'
```

#### Example Response

```json
{
  "churn_probability": 0.15,
  "churn_prediction": false,
  "confidence": "low"
}
```

## Docker Deployment

### Using Docker Compose

Start MLflow and API services:

```bash
docker-compose up -d
```

This will start:
- MLflow tracking server on port 5000
- FastAPI service on port 8000

### Building Docker Image

```bash
docker build -t churn-prediction-api .
```

### Running Container

```bash
docker run -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/data:/app/data \
  churn-prediction-api
```

## Cloud Deployment

### AWS Deployment

1. **Prerequisites**:
   - AWS CLI configured
   - Docker installed
   - Appropriate AWS permissions

2. **Deploy to ECR**:
   ```bash
   chmod +x scripts/deploy_aws.sh
   ./scripts/deploy_aws.sh
   ```

3. **Deploy to ECS**:
   - Update `aws-deployment/ecs-task-definition.json` with your account ID
   - Register the task definition:
     ```bash
     aws ecs register-task-definition --cli-input-json file://aws-deployment/ecs-task-definition.json
     ```
   - Create an ECS service using the task definition

### Azure Deployment

1. **Prerequisites**:
   - Azure CLI installed and logged in
   - Docker installed

2. **Deploy to ACR and App Service**:
   ```bash
   chmod +x scripts/deploy_azure.sh
   ./scripts/deploy_azure.sh
   ```

3. **Manual Configuration**:
   - Update `azure-deployment/app-service-config.json` with your subscription ID
   - Configure ACR credentials in App Service settings

## Configuration

### Model Selection

In `config.yaml`, set:
```yaml
model:
  type: "lightgbm"  # or "catboost"
```

### Data Processing

To use polars instead of pandas, modify `src/train.py`:
```python
processor = DataProcessor(use_polars=True)
```

### MLflow Tracking

Configure MLflow in `config.yaml`:
```yaml
mlflow:
  tracking_uri: "http://localhost:5000"
  experiment_name: "fintech_churn_prediction"
```

For remote tracking, use:
- AWS: `http://your-mlflow-server:5000`
- Azure: `https://your-mlflow-server.azurewebsites.net`

## Model Features

The model expects the following features:
- `account_age_days`: Account age in days
- `transaction_count`: Number of transactions
- `avg_transaction_amount`: Average transaction amount
- `login_frequency`: Login frequency per week
- `support_tickets`: Number of support tickets
- `payment_method`: Payment method (categorical)
- `subscription_type`: Subscription type (categorical)
- `account_balance`: Current account balance

**Note**: Adjust these features in `src/api.py` and `scripts/generate_sample_data.py` based on your actual data schema.

## Development

### Running Tests

```bash
pytest tests/
```

### Code Structure

- `src/data_processing.py`: Data cleaning and preprocessing logic
- `src/train.py`: Model training and MLflow integration
- `src/api.py`: FastAPI service for model serving

## Troubleshooting

### Model Not Found Error

Ensure you've trained a model first:
```bash
python src/train.py
```

### MLflow Connection Issues

If MLflow UI is not accessible, check:
1. MLflow server is running
2. Tracking URI in `config.yaml` is correct
3. Firewall/network settings allow connection

### Docker Build Issues

If Docker build fails:
1. Check Docker is running
2. Verify all files are in the correct locations
3. Check Dockerfile paths are correct

## License

This project is provided as-is for educational and demonstration purposes.

## Contributing

Feel free to submit issues and enhancement requests!

