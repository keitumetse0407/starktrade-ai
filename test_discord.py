#!/usr/bin/env python3
"""
Quick Discord signal test.

Usage:
    python3 test_discord.py YOUR_WEBHOOK_URL
    # or set DISCORD_WEBHOOK_URL in .env and run: python3 test_discord.py
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def main():
    if len(sys.argv) > 1:
        webhook_url = sys.argv[1]
    else:
        webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")

    if not webhook_url:
        print("❌ No webhook URL provided")
        print("Usage: python3 test_discord.py YOUR_WEBHOOK_URL")
        sys.exit(1)

    from engine.discord_notifier import send_signal_embed, test_discord_connection

    # Step 1: Test connection
    print("🔗 Testing Discord webhook connection...")
    result = await test_discord_connection()
    if not result.get("connected"):
        print(f"❌ Connection failed: {result.get('error')}")
        sys.exit(1)
    print("✅ Connection successful!")

    # Step 2: Send a test signal embed
    print("\n📊 Sending test signal embed...")
    message_id = await send_signal_embed(
        symbol="XAUUSD",
        direction="BUY",
        entry=4651.50,
        stop_loss=4590.00,
        take_profit=4750.00,
        confidence=75.0,
        rationale="Multi-agent consensus: Strong bullish alignment. 200 EMA support holding. RSI divergence detected.",
        webhook_url=webhook_url,
    )
    print(f"✅ Signal sent! Message ID: {message_id}")
    print("\nCheck your Discord channel — you should see a green BUY signal card.")


if __name__ == "__main__":
    asyncio.run(main())
