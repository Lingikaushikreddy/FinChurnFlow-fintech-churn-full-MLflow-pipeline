"""
Generate sample fintech customer data for testing.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import random

def generate_sample_data(n_samples: int = 1000, output_path: str = "data/raw/customer_data.csv"):
    """Generate sample customer data for churn prediction."""
    
    # Create directory if it doesn't exist
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    np.random.seed(42)
    random.seed(42)
    
    # Generate features
    data = {
        'customer_id': [f'CUST_{i:05d}' for i in range(1, n_samples + 1)],
        'account_age_days': np.random.randint(30, 730, n_samples),
        'transaction_count': np.random.poisson(50, n_samples),
        'avg_transaction_amount': np.random.lognormal(4, 1, n_samples),
        'login_frequency': np.random.exponential(2, n_samples),
        'support_tickets': np.random.poisson(1, n_samples),
        'payment_method': np.random.choice(['credit_card', 'debit_card', 'bank_transfer', 'paypal'], n_samples),
        'subscription_type': np.random.choice(['basic', 'premium', 'enterprise'], n_samples, p=[0.5, 0.3, 0.2]),
        'account_balance': np.random.lognormal(6, 1.5, n_samples),
        'last_login_days_ago': np.random.exponential(5, n_samples),
        'total_spent': np.random.lognormal(5, 1.2, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Generate churn target based on features (simulated relationship)
    # Customers with low activity, high support tickets, or low balance are more likely to churn
    churn_prob = (
        0.1 +  # Base probability
        (df['login_frequency'] < 1) * 0.3 +
        (df['support_tickets'] > 3) * 0.2 +
        (df['account_balance'] < 100) * 0.25 +
        (df['transaction_count'] < 10) * 0.15 +
        (df['last_login_days_ago'] > 30) * 0.2
    )
    churn_prob = np.clip(churn_prob, 0, 1)
    
    df['churn'] = (np.random.random(n_samples) < churn_prob).astype(int)
    
    # Add some missing values
    missing_indices = np.random.choice(df.index, size=int(n_samples * 0.05), replace=False)
    for idx in missing_indices:
        col = np.random.choice(['account_balance', 'login_frequency'])
        df.loc[idx, col] = np.nan
    
    # Save to CSV
    df.to_csv(output_path, index=False)
    print(f"Generated {n_samples} samples and saved to {output_path}")
    print(f"Churn rate: {df['churn'].mean():.2%}")
    
    return df

if __name__ == "__main__":
    generate_sample_data(n_samples=5000)

