"""
Trains the supplier early-warning RandomForest model on supplier_data.csv
and exports it to ONNX for serving from Node.js (see ../ml/riskEngine.js).

Usage:
    python3 train_and_export.py [path/to/supplier_data.csv]
"""
import sys
import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/supplier_data.csv"

FEATURES = [
    'financial_health_score', 'profit_margin', 'debt_to_equity', 'current_ratio',
    'bankruptcy_risk', 'on_time_delivery', 'defect_rate', 'capacity_util',
    'lead_time_days', 'contract_compliance', 'dispute_rate', 'payment_delay_days',
    'years_relation', 'late_penalty',
]

def main():
    df = pd.read_csv(CSV_PATH)
    X = df[FEATURES]
    y = (df['risk_category'] == 'Watchlist').astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=150, max_depth=8, random_state=42, class_weight='balanced'
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, preds))
    print(classification_report(y_test, preds, target_names=['Stable', 'Watchlist']))

    importances = dict(zip(FEATURES, model.feature_importances_))
    importances = dict(sorted(importances.items(), key=lambda x: -x[1]))
    with open('feature_importance.json', 'w') as f:
        json.dump(importances, f, indent=2)
    with open('features.json', 'w') as f:
        json.dump(FEATURES, f)

    joblib.dump(model, 'risk_model.pkl')

    initial_type = [('input', FloatTensorType([None, len(FEATURES)]))]
    onnx_model = convert_sklearn(
        model, initial_types=initial_type, options={id(model): {'zipmap': False}}
    )
    with open('risk_model.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())

    print("\nSaved: risk_model.pkl, risk_model.onnx, features.json, feature_importance.json")
    print("Copy risk_model.onnx + features.json + feature_importance.json into ../ml/model/")

if __name__ == '__main__':
    main()
