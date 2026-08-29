"""
Trains and compares 3 algorithms on supplier_data.csv:
  1. Logistic Regression  — simple linear baseline
  2. Random Forest        — bagging ensemble (original model)
  3. XGBoost               — gradient boosting (CHOSEN deployment algorithm)

Prints a full comparison table (accuracy/precision/recall/F1) for your
report, then exports XGBoost specifically to ONNX for serving — the
comparison is for justification in your methodology section; XGBoost is
deployed regardless of which one scores highest, per your requirement.

Usage:
    python3 train_compare_export.py [path/to/supplier_data.csv]

Install first:
    pip install scikit-learn xgboost onnxmltools skl2onnx onnx pandas joblib
"""
import sys
import json
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "supplier_data.csv"

FEATURES = [
    'financial_health_score', 'profit_margin', 'debt_to_equity', 'current_ratio',
    'bankruptcy_risk', 'on_time_delivery', 'defect_rate', 'capacity_util',
    'lead_time_days', 'contract_compliance', 'dispute_rate', 'payment_delay_days',
    'years_relation', 'late_penalty',
]


def evaluate(name, model, X_test, y_test):
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds)
    rec = recall_score(y_test, preds)
    f1 = f1_score(y_test, preds)
    print(f"\n--- {name} ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(classification_report(y_test, preds, target_names=['Stable', 'Watchlist']))
    return {'name': name, 'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': f1}


def main():
    df = pd.read_csv(CSV_PATH)
    X = df[FEATURES]
    y = (df['risk_category'] == 'Watchlist').astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = []

    # ---- 1. Logistic Regression — baseline ----
    lr = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    lr.fit(X_train, y_train)
    results.append(evaluate('Logistic Regression', lr, X_test, y_test))

    # ---- 2. Random Forest — bagging ensemble (your original model) ----
    rf = RandomForestClassifier(
        n_estimators=150, max_depth=8, random_state=42, class_weight='balanced'
    )
    rf.fit(X_train, y_train)
    results.append(evaluate('Random Forest', rf, X_test, y_test))

    # ---- 3. XGBoost — gradient boosting (chosen deployment algorithm) ----
    # scale_pos_weight handles class imbalance the XGBoost way (equivalent
    # idea to class_weight='balanced' in sklearn models).
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    xgb = XGBClassifier(
        n_estimators=150, max_depth=6, learning_rate=0.1,
        scale_pos_weight=scale_pos_weight, random_state=42,
        eval_metric='logloss',
    )
    xgb.fit(X_train.values, y_train)
    results.append(evaluate('XGBoost', xgb, X_test, y_test))

    # ---- Comparison table — copy this straight into your report ----
    print("\n\n=== COMPARISON TABLE ===")
    print(f"{'Model':<22}{'Accuracy':<12}{'Precision':<12}{'Recall':<12}{'F1':<12}")
    for r in results:
        print(f"{r['name']:<22}{r['accuracy']:<12.4f}{r['precision']:<12.4f}{r['recall']:<12.4f}{r['f1']:<12.4f}")

    best = max(results, key=lambda r: r['accuracy'])
    print(f"\nHighest accuracy: {best['name']} ({best['accuracy']:.4f})")
    print("Deploying: XGBoost (the chosen production algorithm per project requirements,")
    print("independent of which model scored highest above — see report methodology section).")

    # ---- Export XGBoost to ONNX for serving from ml/riskEngine.js ----
    print("\nExporting XGBoost to ONNX...")
    import onnxmltools
    from onnxmltools.convert.common.data_types import FloatTensorType as MLFloatTensorType

    onnx_model = onnxmltools.convert_xgboost(
        xgb, initial_types=[('input', MLFloatTensorType([None, len(FEATURES)]))]
    )
    with open('risk_model.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())

    importances = dict(zip(FEATURES, xgb.feature_importances_.tolist()))
    importances = {k: float(v) for k, v in sorted(importances.items(), key=lambda x: -x[1])}
    with open('feature_importance.json', 'w') as f:
        json.dump(importances, f, indent=2)
    with open('features.json', 'w') as f:
        json.dump(FEATURES, f)

    # Keep all 3 as .pkl too — useful appendix evidence for your report
    joblib.dump(xgb, 'risk_model_xgboost.pkl')
    joblib.dump(rf, 'risk_model_randomforest.pkl')
    joblib.dump(lr, 'risk_model_logisticregression.pkl')

    print("\nSaved: risk_model.onnx (XGBoost), features.json, feature_importance.json")
    print("Also saved risk_model_xgboost.pkl / risk_model_randomforest.pkl / risk_model_logisticregression.pkl")
    print("Copy risk_model.onnx + features.json + feature_importance.json into ../ml/model/")


if __name__ == '__main__':
    main()
