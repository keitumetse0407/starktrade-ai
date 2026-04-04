"""Quant Agent - ML-based signal classification using scikit-learn"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
import joblib
import os
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "gold_quant_rf.pkl")
GB_PATH = os.path.join(MODEL_DIR, "gold_quant_gb.pkl")


class QuantAgent:
    """Machine learning agent trained on historical gold data."""

    def __init__(self):
        self.rf = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42, min_samples_leaf=5)
        self.gb = GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42, learning_rate=0.1)
        self.rf_trained = False
        self.gb_trained = False

        # Feature columns — must match what prepare_features() produces
        self.feature_cols = [
            "rsi_14", "macd_histogram", "bb_width", "atr_14",
            "returns_1d", "returns_5d", "volatility_10d", "volatility_20d",
            "volume_ratio",
            "bb_position",  # where price sits in BB range (0=lower, 1=upper)
            "rsi_zone",      # 0=oversold, 1=neutral, 2=overbought
            "ema_alignment", # -1=bearish, 0=mixed, +1=bullish
        ]

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create ML-ready features from OHLCV + indicator data.
        Target: 1 if price moves up by next candle, 0 otherwise.
        """
        if df.empty or "close" not in df.columns:
            return pd.DataFrame()

        df = df.copy()

        # Requires indicators already calculated
        required = ["rsi_14", "macd_histogram", "bb_upper", "bb_lower", "atr_14"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            logger.error(f"Missing indicator columns: {missing}. Run TechnicalIndicators.calculate_all() first.")
            return pd.DataFrame()

        # BB position: where is price within the band? (0=bottom, 1=top)
        bb_range = df["bb_upper"] - df["bb_lower"]
        df["bb_position"] = (df["close"] - df["bb_lower"]) / bb_range.replace(0, np.nan)
        df["bb_position"] = df["bb_position"].clip(0, 1)

        # RSI zone encoding
        df["rsi_zone"] = pd.cut(
            df["rsi_14"],
            bins=[0, 30, 70, 100],
            labels=[0, 1, 2],
        ).astype(float)

        # EMA alignment
        if all(c in df.columns for c in ["ema_9", "ema_21", "ema_50"]):
            df["ema_alignment"] = np.where(
                (df["ema_9"] > df["ema_21"]) & (df["ema_21"] > df["ema_50"]), 1,
                np.where((df["ema_9"] < df["ema_21"]) & (df["ema_21"] < df["ema_50"]), -1, 0),
            )

        # Returns
        for period in [1, 5]:
            df[f"returns_{period}d"] = df["close"].pct_change(period)

        # Volatility
        for window in [10, 20]:
            df[f"volatility_{window}d"] = df["close"].pct_change().rolling(window).std()

        # Volume ratio
        df["volume_ma_20"] = df["volume"].rolling(20).mean()
        df["volume_ratio"] = df["volume"] / df["volume_ma_20"].replace(0, np.nan)

        # Target: 1 if next close > current close
        df["target"] = (df["close"].shift(-1) > df["close"]).astype(int)

        # Clean
        df = df.dropna(subset=self.feature_cols + ["target"])
        return df

    def train(self, df: pd.DataFrame) -> Dict:
        """Train RF and GB models. Returns accuracy metrics."""
        feature_df = self.prepare_features(df)
        if feature_df.empty:
            return {"error": "No features. Ensure indicators are calculated."}

        X = feature_df[self.feature_cols]
        y = feature_df["target"]

        # Time-aware split (don't shuffle, keep temporal order)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Train Random Forest
        self.rf.fit(X_train, y_train)
        rf_acc = self.rf.score(X_test, y_test)
        self.rf_trained = True

        # Train Gradient Boosting
        self.gb.fit(X_train, y_train)
        gb_acc = self.gb.score(X_test, y_test)
        self.gb_trained = True

        # Save models
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.rf, MODEL_PATH)
        joblib.dump(self.gb, GB_PATH)

        # Feature importance
        importances = dict(zip(self.feature_cols, self.rf.feature_importances_))
        top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]

        logger.info(f"RF accuracy: {rf_acc:.4f}, GB accuracy: {gb_acc:.4f}")

        return {
            "random_forest_accuracy": round(rf_acc, 4),
            "gradient_boosting_accuracy": round(gb_acc, 4),
            "samples_train": len(X_train),
            "samples_test": len(X_test),
            "top_features": [{"name": n, "importance": round(v, 4)} for n, v in top_features],
        }

    def load(self) -> bool:
        """Load trained models from disk."""
        if os.path.exists(MODEL_PATH) and os.path.exists(GB_PATH):
            self.rf = joblib.load(MODEL_PATH)
            self.gb = joblib.load(GB_PATH)
            self.rf_trained = True
            self.gb_trained = True
            logger.info("Loaded trained models from disk")
            return True
        return False

    def predict(self, df: pd.DataFrame) -> Optional[Dict]:
        """Predict direction on latest data row."""
        if not self.rf_trained or not self.gb_trained:
            if not self.load():
                return None

        feature_df = self.prepare_features(df)
        if feature_df.empty:
            return None

        latest = feature_df[self.feature_cols].iloc[[-1]]

        # Ensemble: average both models
        prob_rf = self.rf.predict_proba(latest)[0]
        prob_gb = self.gb.predict_proba(latest)[0]
        prob_avg = (prob_rf + prob_gb) / 2

        # prob[0] = P(down), prob[1] = P(up)
        p_up = prob_avg[1]
        p_down = prob_avg[0]

        if p_up > 0.55:
            signal = "BUY"
            confidence = p_up
        elif p_down > 0.55:
            signal = "SELL"
            confidence = p_down
        else:
            signal = "HOLD"
            confidence = max(p_up, p_down)

        # --- Trend filter: never fight the 200 EMA ---
        # Downgrade counter-trend signals to HOLD to avoid getting chopped in a strong trend
        if "ema_200" in df.columns:
            latest_close = df["close"].iloc[-1]
            ema_200 = df["ema_200"].iloc[-1]
            if ema_200 > 0:  # valid EMA value
                if latest_close > ema_200 and signal == "SELL":
                    logger.info(f"Trend filter: SELL downgraded to HOLD (price {latest_close:.2f} > EMA200 {ema_200:.2f})")
                    signal = "HOLD"
                    confidence = max(confidence, 0.50)  # keep confidence for logging but mark as no-trade
                elif latest_close < ema_200 and signal == "BUY":
                    logger.info(f"Trend filter: BUY downgraded to HOLD (price {latest_close:.2f} < EMA200 {ema_200:.2f})")
                    signal = "HOLD"
                    confidence = max(confidence, 0.50)

        return {
            "agent": "QuantAgent (RF+GB ensemble)",
            "signal": signal,
            "confidence": round(float(confidence), 3),
            "p_up": round(float(p_up), 3),
            "p_down": round(float(p_down), 3),
        }
