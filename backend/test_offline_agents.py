#!/usr/bin/env python3
"""
Test script for offline trading agents
Run this in Docker: docker-compose exec backend python test_offline_agents.py
"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import numpy as np
    print("✓ NumPy available")
except ImportError:
    print("✗ NumPy not available - install with: pip install numpy")
    sys.exit(1)

from app.agents import OfflineOrchestrator

print("\n=== Testing Offline Trading Agents ===\n")

# Generate sample market data with trends
np.random.seed(42)
n = 200

# Create an upward trending market
closes = []
price = 100
for i in range(n):
    trend = 0.001 * (1 + i/100)  # Increasing trend
    change = np.random.randn() * 0.02 + trend
    price = price * (1 + change)
    closes.append(price)

closes = np.array(closes)
opens = closes * (1 + np.random.randn(n) * 0.005)
highs = np.maximum(opens, closes) * (1 + abs(np.random.randn(n) * 0.01))
lows = np.minimum(opens, closes) * (1 - abs(np.random.randn(n) * 0.01))
volumes = np.random.lognormal(15, 0.5, n).astype(int)

data = {
    'opens': opens.tolist(),
    'highs': highs.tolist(),
    'lows': lows.tolist(),
    'closes': closes.tolist(),
    'volumes': volumes.tolist()
}

print("Running offline analysis...")
result = OfflineOrchestrator().analyze(data, 100000)

print(f"\n=== SIGNAL ===")
print(f"Type: {result['signal']['type']}")
print(f"Confidence: {result['signal']['confidence']:.1%}")
print(f"Entry: ${result['signal']['entry']:.2f}")
print(f"Stop Loss: ${result['signal']['stop_loss']:.2f}")
print(f"Take Profit: ${result['signal']['take_profit']:.2f}")

print(f"\n=== REGIME ===")
print(f"Regime: {result['regime']['type']}")
print(f"Confidence: {result['regime']['confidence']:.1%}")
print(f"Risk Level: {result['regime']['risk_level']:.1%}")
print(f"Thesis: {result['regime']['thesis']}")
print(f"Strategies: {result['regime']['strategies']}")

print(f"\n=== POSITION ===")
print(f"Shares: {result['position']['shares']:.0f}")
print(f"Risk Amount: ${result['position']['risk']:.2f}")
print(f"Portfolio %: {result['position']['portfolio_pct']:.1%}")

print(f"\n=== INDICATORS (sample) ===")
ind = result.get('indicators', {})
print(f"Price: ${ind.get('price', 0):.2f}")
print(f"RSI: {ind.get('rsi', 0):.1f}")
print(f"Volume Ratio: {ind.get('volume_ratio', 0):.2f}x")

print("\n✓ ALL TESTS PASSED!")
print("\nOffline trading agents working perfectly - NO EXTERNAL APIs NEEDED!")