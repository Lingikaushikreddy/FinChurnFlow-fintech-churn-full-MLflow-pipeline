"""
FastAPI service for serving churn prediction model.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import joblib
import pandas as pd
import numpy as np
import yaml
from pathlib import Path
import os

# Load configuration
def load_config():
    """Load configuration from YAML file."""
    config_path = Path("config.yaml")
    if not config_path.exists():
        # Try parent directory
        config_path = Path(__file__).parent.parent / "config.yaml"
    
    if config_path.exists():
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    else:
        return {
            'model': {'model_path': 'models/churn_model.pkl'},
            'api': {'host': '0.0.0.0', 'port': 8000}
        }

config = load_config()

# Initialize FastAPI app
app = FastAPI(
    title="Fintech Churn Prediction API",
    description="API for predicting customer churn on fintech platform",
    version="1.0.0"
)

# Load model
model = None
# Get model path relative to project root
model_path_rel = config.get('model', {}).get('model_path', 'models/churn_model.pkl')
model_path = Path(model_path_rel)
if not model_path.is_absolute():
    # Try relative to current file, then project root
    model_path = Path(__file__).parent.parent / model_path_rel


def load_model():
    """Load the trained model."""
    global model
    if model is None:
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        model = joblib.load(model_path)
    return model


# Request/Response models
class PredictionRequest(BaseModel):
    """Request model for churn prediction."""
    # Example feature fields - adjust based on your actual features
    account_age_days: float = Field(..., description="Account age in days")
    transaction_count: float = Field(..., description="Number of transactions")
    avg_transaction_amount: float = Field(..., description="Average transaction amount")
    login_frequency: float = Field(..., description="Login frequency per week")
    support_tickets: float = Field(..., description="Number of support tickets")
    payment_method: str = Field(..., description="Payment method")
    subscription_type: str = Field(..., description="Subscription type")
    account_balance: float = Field(..., description="Current account balance")
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_age_days": 180,
                "transaction_count": 45,
                "avg_transaction_amount": 125.50,
                "login_frequency": 3.5,
                "support_tickets": 2,
                "payment_method": "credit_card",
                "subscription_type": "premium",
                "account_balance": 5000.00
            }
        }


class PredictionResponse(BaseModel):
    """Response model for churn prediction."""
    churn_probability: float = Field(..., description="Probability of churn (0-1)")
    churn_prediction: bool = Field(..., description="Predicted churn status")
    confidence: str = Field(..., description="Confidence level")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    try:
        load_model()
        print(f"Model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Warning: Could not load model: {e}")


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check."""
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict churn probability for a customer.
    
    Args:
        request: Customer features
        
    Returns:
        Churn prediction with probability
    """
    try:
        model = load_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not available: {str(e)}")
    
    # Convert request to DataFrame
    # Note: You'll need to adjust feature names based on your actual model
    feature_dict = request.dict()
    
    # Create DataFrame with single row
    df = pd.DataFrame([feature_dict])
    
    # Handle categorical encoding if needed
    # This is a simplified version - you may need to load label encoders
    categorical_cols = ['payment_method', 'subscription_type']
    for col in categorical_cols:
        if col in df.columns:
            # Simple encoding - in production, use the same encoders from training
            df[col] = pd.Categorical(df[col]).codes
    
    # Ensure column order matches training data
    # You may need to save feature names during training
    try:
        prediction_proba = model.predict_proba(df)[0]
        churn_probability = float(prediction_proba[1])  # Probability of churn (class 1)
        churn_prediction = bool(model.predict(df)[0])
        
        # Determine confidence
        if churn_probability > 0.7:
            confidence = "high"
        elif churn_probability > 0.5:
            confidence = "medium"
        else:
            confidence = "low"
        
        return PredictionResponse(
            churn_probability=churn_probability,
            churn_prediction=churn_prediction,
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/predict_batch")
async def predict_batch(requests: List[PredictionRequest]):
    """
    Predict churn for multiple customers at once.
    
    Args:
        requests: List of customer features
        
    Returns:
        List of predictions
    """
    try:
        model = load_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not available: {str(e)}")
    
    # Convert requests to DataFrame
    feature_dicts = [req.dict() for req in requests]
    df = pd.DataFrame(feature_dicts)
    
    # Handle categorical encoding
    categorical_cols = ['payment_method', 'subscription_type']
    for col in categorical_cols:
        if col in df.columns:
            df[col] = pd.Categorical(df[col]).codes
    
    try:
        predictions_proba = model.predict_proba(df)
        predictions = model.predict(df)
        
        results = []
        for i, (proba, pred) in enumerate(zip(predictions_proba, predictions)):
            churn_probability = float(proba[1])
            churn_prediction = bool(pred)
            
            if churn_probability > 0.7:
                confidence = "high"
            elif churn_probability > 0.5:
                confidence = "medium"
            else:
                confidence = "low"
            
            results.append({
                "churn_probability": churn_probability,
                "churn_prediction": churn_prediction,
                "confidence": confidence
            })
        
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host=config['api']['host'],
        port=config['api']['port'],
        reload=config['api'].get('reload', False)
    )

