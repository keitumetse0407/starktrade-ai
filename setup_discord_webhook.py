#!/usr/bin/env python3
"""
Discord Webhook Setup — run this to create a webhook and configure .env

Usage:
    python3 setup_discord_webhook.py

This script will:
1. Guide you through creating a Discord webhook
2. Test the webhook with a test message
3. Add DISCORD_WEBHOOK_URL to your .env file
"""
import os
import sys
import asyncio

BANNER = r"""
╔══════════════════════════════════════════════════════════╗
║     Discord Webhook Setup — StarkTrade AI Signals        ║
╚══════════════════════════════════════════════════════════╝
"""

def print_step(num: int, text: str):
    print(f"\n  [{'0' if num < 10 else ''}{num}] {text}")

def print_box(text: str):
    width = max(len(line) for line in text.split('\n'))
    print(f"  ┌{'─' * (width + 2)}┐")
    for line in text.split('\n'):
        print(f"  │ {line.ljust(width)} │")
    print(f"  └{'─' * (width + 2)}┘")

async def main():
    print(BANNER)

    print_step(1, "Create a Discord Webhook")
    print_box("""To get your webhook URL:

  1. Open Discord → go to your server
  2. Find the channel where you want signals
  3. Click the ⚙️ gear icon (Edit Channel)
  4. Go to Integrations → Webhooks
  5. Click "New Webhook"
  6. Name it: "StarkTrade AI"
  7. Click "Copy Webhook URL"
  8. Paste it below""")

    webhook_url = input("\n  Paste your webhook URL: ").strip()

    if not webhook_url.startswith("https://discord.com/api/webhooks/"):
        print("\n  ❌ That doesn't look like a valid Discord webhook URL.")
        print("     It should start with: https://discord.com/api/webhooks/")
        sys.exit(1)

    print_step(2, "Testing webhook connection...")

    try:
        from engine.discord_notifier import test_discord_connection

        # Temporarily set env var for this session
        os.environ["DISCORD_WEBHOOK_URL"] = webhook_url
        result = await test_discord_connection()

        if result.get("connected"):
            print("  ✅ Webhook works! Check your Discord channel — you should see a test message.")
        else:
            print(f"  ❌ Test failed: {result.get('error')}")
            sys.exit(1)
    except ImportError:
        print("  ⚠️  Can't import test module. Testing with raw HTTP...")
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json={
                "content": "🔗 **StarkTrade AI — Connection Test**\n\nWebhook is working. Signals will appear here."
            })
            if resp.status_code in (200, 204):
                print("  ✅ Webhook works! Check your Discord channel.")
            else:
                print(f"  ❌ Failed: HTTP {resp.status_code} — {resp.text}")
                sys.exit(1)

    print_step(3, "Writing to .env file...")

    env_path = os.path.join(os.path.dirname(__file__), ".env")

    # Read existing .env or create new
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    # Update or add DISCORD_WEBHOOK_URL
    found = False
    for i, line in enumerate(lines):
        if line.startswith("DISCORD_WEBHOOK_URL="):
            lines[i] = f"DISCORD_WEBHOOK_URL={webhook_url}\n"
            found = True
            break

    if not found:
        lines.append(f"\n# Discord — Signal delivery\nDISCORD_WEBHOOK_URL={webhook_url}\n")

    with open(env_path, "w") as f:
        f.writelines(lines)

    print(f"  ✅ DISCORD_WEBHOOK_URL written to {env_path}")

    print("\n" + "=" * 60)
    print("  🎉 DONE! Your Discord webhook is configured and working.")
    print("  Signals will now appear in your Discord channel.")
    print("=" * 60)

    # Test signal
    print("\n  Want to send a test signal? (y/n): ", end="")
    choice = input().strip().lower()
    if choice == "y":
        try:
            from engine.discord_notifier import send_signal_embed
            msg_id = await send_signal_embed(
                symbol="XAUUSD",
                direction="BUY",
                entry=4651.50,
                stop_loss=4590.00,
                take_profit=4750.00,
                confidence=75.0,
                rationale="Multi-agent consensus: Strong bullish alignment. 200 EMA support holding. RSI divergence detected.",
                webhook_url=webhook_url,
            )
            print(f"  ✅ Test signal sent! Message ID: {msg_id}")
        except Exception as e:
            print(f"  ❌ Failed to send signal: {e}")


if __name__ == "__main__":
    asyncio.run(main())
