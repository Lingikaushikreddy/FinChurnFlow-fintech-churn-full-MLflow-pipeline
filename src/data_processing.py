"""
Data processing module for churn prediction.
Supports both pandas and polars for data cleaning and preprocessing.
"""

import pandas as pd
import polars as pl
import numpy as np
from typing import Union, Tuple, Optional
from pathlib import Path
import yaml


class DataProcessor:
    """Data processor for cleaning and preprocessing fintech customer data."""
    
    def __init__(self, use_polars: bool = False):
        """
        Initialize the data processor.
        
        Args:
            use_polars: If True, use polars; otherwise use pandas
        """
        self.use_polars = use_polars
        self.feature_columns = None
        self.categorical_columns = None
        self.numerical_columns = None
    
    def load_data(self, file_path: str) -> Union[pd.DataFrame, pl.DataFrame]:
        """Load data from CSV file."""
        if self.use_polars:
            return pl.read_csv(file_path)
        else:
            return pd.read_csv(file_path)
    
    def clean_data(self, df: Union[pd.DataFrame, pl.DataFrame]) -> Union[pd.DataFrame, pl.DataFrame]:
        """
        Clean the raw customer data.
        
        Handles:
        - Missing values
        - Duplicate records
        - Data type conversions
        - Outlier detection and treatment
        """
        if self.use_polars:
            return self._clean_polars(df)
        else:
            return self._clean_pandas(df)
    
    def _clean_pandas(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean data using pandas."""
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Handle missing values in numerical columns
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        for col in numerical_cols:
            if df[col].isnull().sum() > 0:
                df[col] = df[col].fillna(df[col].median())
        
        # Handle missing values in categorical columns
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if df[col].isnull().sum() > 0:
                df[col] = df[col].fillna('unknown')
        
        # Remove outliers using IQR method for numerical columns
        for col in numerical_cols:
            if col != 'churn':  # Don't process target column
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
        
        return df
    
    def _clean_polars(self, df: pl.DataFrame) -> pl.DataFrame:
        """Clean data using polars."""
        # Remove duplicates
        df = df.unique()
        
        # Handle missing values
        # For numerical columns, fill with median
        numerical_cols = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64]]
        
        for col in numerical_cols:
            if col != 'churn':
                median_val = df[col].median()
                df = df.with_columns(pl.col(col).fill_null(median_val))
        
        # For categorical columns, fill with 'unknown'
        categorical_cols = [col for col in df.columns if df[col].dtype == pl.Utf8]
        
        for col in categorical_cols:
            df = df.with_columns(pl.col(col).fill_null("unknown"))
        
        # Remove outliers using IQR method
        for col in numerical_cols:
            if col != 'churn':
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                df = df.with_columns(
                    pl.col(col).clip(lower_bound, upper_bound).alias(col)
                )
        
        return df
    
    def preprocess_data(
        self, 
        df: Union[pd.DataFrame, pl.DataFrame],
        target_column: str = "churn"
    ) -> Tuple[Union[pd.DataFrame, pl.DataFrame], Union[pd.Series, pl.Series]]:
        """
        Preprocess data for model training.
        
        Args:
            df: Input dataframe
            target_column: Name of the target column
            
        Returns:
            Tuple of (features, target)
        """
        if self.use_polars:
            return self._preprocess_polars(df, target_column)
        else:
            return self._preprocess_pandas(df, target_column)
    
    def _preprocess_pandas(
        self, 
        df: pd.DataFrame, 
        target_column: str
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """Preprocess data using pandas."""
        # Separate features and target
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataframe")
        
        y = df[target_column]
        X = df.drop(columns=[target_column])
        
        # Identify categorical and numerical columns
        self.categorical_columns = X.select_dtypes(include=['object']).columns.tolist()
        self.numerical_columns = X.select_dtypes(include=[np.number]).columns.tolist()
        self.feature_columns = X.columns.tolist()
        
        # Encode categorical variables (simple label encoding for LightGBM/CatBoost)
        from sklearn.preprocessing import LabelEncoder
        
        label_encoders = {}
        for col in self.categorical_columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le
        
        self.label_encoders = label_encoders
        
        return X, y
    
    def _preprocess_polars(
        self, 
        df: pl.DataFrame, 
        target_column: str
    ) -> Tuple[pl.DataFrame, pl.Series]:
        """Preprocess data using polars."""
        # Convert to pandas for encoding (polars doesn't have sklearn integration)
        # Then convert back
        df_pd = df.to_pandas()
        X, y = self._preprocess_pandas(df_pd, target_column)
        return pl.from_pandas(X), pl.from_pandas(y.to_frame())[target_column]
    
    def save_processed_data(
        self, 
        X: Union[pd.DataFrame, pl.DataFrame],
        y: Union[pd.Series, pl.Series],
        output_path: str
    ):
        """Save processed data to parquet format."""
        if self.use_polars:
            if isinstance(X, pl.DataFrame) and isinstance(y, pl.Series):
                df = X.with_columns(y.alias('churn'))
                df.write_parquet(output_path)
            else:
                # Convert to polars if needed
                X_pl = pl.from_pandas(X) if isinstance(X, pd.DataFrame) else X
                y_pl = pl.from_pandas(y.to_frame()) if isinstance(y, pd.Series) else y
                df = X_pl.with_columns(y_pl)
                df.write_parquet(output_path)
        else:
            if isinstance(X, pd.DataFrame):
                df = X.copy()
                df['churn'] = y
            else:
                # Convert to pandas if needed
                df = X.to_pandas()
                df['churn'] = y.to_pandas() if hasattr(y, 'to_pandas') else y
            df.to_parquet(output_path, index=False)

