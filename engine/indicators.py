"""Technical Indicators Engine - Pure pandas/numpy, no paid libraries"""
import pandas as pd
import numpy as np
from typing import Tuple


class TechnicalIndicators:
    """Calculate all technical indicators needed by agents."""

    @staticmethod
    def calculate_all(df: pd.DataFrame) -> pd.DataFrame:
        """Calculate every indicator in one pass."""
        df = df.copy()

        # --- Moving Averages ---
        for period in [9, 20, 21, 50, 200]:
            df[f"ma_{period}"] = df["close"].rolling(window=period).mean()
            df[f"ema_{period}"] = df["close"].ewm(span=period, adjust=False).mean()

        # --- RSI (14) ---
        df["rsi_14"] = TechnicalIndicators._rsi(df["close"], window=14)

        # --- MACD ---
        macd, signal_line, histogram = TechnicalIndicators._macd(df["close"])
        df["macd"] = macd
        df["macd_signal"] = signal_line
        df["macd_histogram"] = histogram

        # --- Bollinger Bands (20, 2) ---
        bb_upper, bb_middle, bb_lower = TechnicalIndicators._bollinger_bands(df["close"])
        df["bb_upper"] = bb_upper
        df["bb_middle"] = bb_middle
        df["bb_lower"] = bb_lower
        df["bb_width"] = (bb_upper - bb_lower) / bb_middle  # Band width normalized

        # --- ATR (14) ---
        df["atr_14"] = TechnicalIndicators._atr(df, window=14)

        # --- Volume indicators ---
        df["volume_ma_20"] = df["volume"].rolling(window=20).mean()
        df["volume_ratio"] = df["volume"] / df["volume_ma_20"]

        # --- Price momentum ---
        for period in [1, 5, 10, 20]:
            df[f"returns_{period}d"] = df["close"].pct_change(period)

        # --- Volatility ---
        df["volatility_10d"] = df["close"].pct_change().rolling(window=10).std()
        df["volatility_20d"] = df["close"].pct_change().rolling(window=20).std()

        # --- Support / Resistance (simplified) ---
        df["support_20"] = df["low"].rolling(window=20).min()
        df["resistance_20"] = df["high"].rolling(window=20).max()

        return df

    @staticmethod
    def _rsi(prices: pd.Series, window: int = 14) -> pd.Series:
        """Relative Strength Index."""
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))

    @staticmethod
    def _macd(
        prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD line, signal line, histogram."""
        ema_fast = prices.ewm(span=fast, adjust=False).mean()
        ema_slow = prices.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    @staticmethod
    def _bollinger_bands(
        prices: pd.Series, window: int = 20, num_std: float = 2.0
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Bollinger Bands."""
        middle = prices.rolling(window=window).mean()
        std = prices.rolling(window=window).std()
        upper = middle + (std * num_std)
        lower = middle - (std * num_std)
        return upper, middle, lower

    @staticmethod
    def _atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
        """Average True Range."""
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift()).abs()
        low_close = (df["low"] - df["close"].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return true_range.rolling(window=window).mean()
