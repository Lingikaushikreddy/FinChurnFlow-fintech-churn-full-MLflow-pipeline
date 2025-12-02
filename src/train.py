"""
Model training script with MLflow tracking.
Supports LightGBM and CatBoost models.
"""

import os
import yaml
import mlflow
import mlflow.sklearn
import mlflow.lightgbm
import mlflow.catboost
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    roc_auc_score,
    classification_report,
    confusion_matrix
)
import lightgbm as lgb
import catboost as cb
import joblib
from typing import Dict, Any

try:
    from src.data_processing import DataProcessor
except ImportError:
    from data_processing import DataProcessor


def load_config(config_path: str = "config.yaml") -> Dict[str, Any]:
    """Load configuration from YAML file."""
    # Try to find config.yaml in current directory or parent directory
    if not Path(config_path).exists():
        parent_config = Path(__file__).parent.parent / config_path
        if parent_config.exists():
            config_path = str(parent_config)
    
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def train_lightgbm(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    config: Dict[str, Any]
) -> lgb.LGBMClassifier:
    """Train LightGBM model."""
    params = config['lightgbm']
    
    model = lgb.LGBMClassifier(**params)
    
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(stopping_rounds=10), lgb.log_evaluation(period=10)]
    )
    
    return model


def train_catboost(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    config: Dict[str, Any]
) -> cb.CatBoostClassifier:
    """Train CatBoost model."""
    params = config['catboost'].copy()
    
    # CatBoost specific parameters
    model = cb.CatBoostClassifier(**params)
    
    model.fit(
        X_train,
        y_train,
        eval_set=(X_val, y_val),
        verbose_eval=10,
        early_stopping_rounds=10
    )
    
    return model


def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
    """Evaluate model and return metrics."""
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, zero_division=0),
        'recall': recall_score(y_test, y_pred, zero_division=0),
        'f1_score': f1_score(y_test, y_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_test, y_pred_proba)
    }
    
    return metrics


def main():
    """Main training function."""
    # Load configuration
    config = load_config()
    
    # Initialize MLflow
    mlflow.set_tracking_uri(config['mlflow']['tracking_uri'])
    mlflow.set_experiment(config['mlflow']['experiment_name'])
    
    # Get project root directory
    project_root = Path(__file__).parent.parent
    
    # Create directories
    (project_root / "data/processed").mkdir(parents=True, exist_ok=True)
    (project_root / "models").mkdir(parents=True, exist_ok=True)
    
    # Update paths to be relative to project root
    data_config = config['data']
    for key in ['raw_data_path', 'processed_data_path', 'train_data_path', 'test_data_path']:
        if key in data_config:
            data_config[key] = str(project_root / data_config[key])
    
    config['model']['model_path'] = str(project_root / config['model']['model_path'])
    
    # Load and process data
    print("Loading and processing data...")
    processor = DataProcessor(use_polars=False)  # Can be changed to True for polars
    
    # Check if processed data exists, otherwise process raw data
    if Path(config['data']['processed_data_path']).exists():
        print("Loading processed data...")
        if processor.use_polars:
            import polars as pl
            df = pl.read_parquet(config['data']['processed_data_path']).to_pandas()
        else:
            df = pd.read_parquet(config['data']['processed_data_path'])
        X = df.drop(columns=[config['data']['target_column']])
        y = df[config['data']['target_column']]
    else:
        print("Processing raw data...")
        df = processor.load_data(config['data']['raw_data_path'])
        df = processor.clean_data(df)
        X, y = processor.preprocess_data(df, config['data']['target_column'])
        
        # Convert to pandas if polars
        if processor.use_polars:
            X = X.to_pandas()
            y = y.to_pandas()
        
        # Save processed data
        processor.save_processed_data(
            X, y, 
            config['data']['processed_data_path']
        )
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config['data']['test_size'],
        random_state=config['data']['random_state'],
        stratify=y
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train,
        test_size=0.2,
        random_state=config['data']['random_state'],
        stratify=y_train
    )
    
    # Start MLflow run
    with mlflow.start_run():
        print(f"Training {config['model']['type']} model...")
        
        # Train model
        if config['model']['type'] == 'lightgbm':
            model = train_lightgbm(X_train, y_train, X_val, y_val, config)
            mlflow.lightgbm.log_model(model, "model")
        elif config['model']['type'] == 'catboost':
            model = train_catboost(X_train, y_train, X_val, y_val, config)
            mlflow.catboost.log_model(model, "model")
        else:
            raise ValueError(f"Unknown model type: {config['model']['type']}")
        
        # Evaluate model
        print("Evaluating model...")
        metrics = evaluate_model(model, X_test, y_test)
        
        # Log metrics to MLflow
        for metric_name, metric_value in metrics.items():
            mlflow.log_metric(metric_name, metric_value)
            print(f"{metric_name}: {metric_value:.4f}")
        
        # Log parameters
        if config['model']['type'] == 'lightgbm':
            mlflow.log_params(config['lightgbm'])
        else:
            mlflow.log_params(config['catboost'])
        
        # Log model
        model_path = config['model']['model_path']
        joblib.dump(model, model_path)
        mlflow.log_artifact(model_path)
        
        # Register model
        mlflow.register_model(
            f"runs:/{mlflow.active_run().info.run_id}/model",
            config['mlflow']['registered_model_name']
        )
        
        print(f"\nModel saved to {model_path}")
        print(f"MLflow run ID: {mlflow.active_run().info.run_id}")
        print("\nClassification Report:")
        y_pred = model.predict(X_test)
        print(classification_report(y_test, y_pred))
        
        print("\nConfusion Matrix:")
        print(confusion_matrix(y_test, y_pred))


if __name__ == "__main__":
    main()

