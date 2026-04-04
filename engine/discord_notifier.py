"""Discord notification utility for StarkTrade AI signal delivery.

Sends formatted signal messages to a Discord channel via Webhook.
No bot token needed — just paste the webhook URL.

Setup:
    1. Discord Server → Channel Settings → Integrations → Webhooks → Create
    2. Copy the webhook URL
    3. Set DISCORD_WEBHOOK_URL in .env

Environment variables:
    DISCORD_WEBHOOK_URL — Full webhook URL from Discord
"""

import logging
import httpx
from typing import Optional
import os

logger = logging.getLogger(__name__)


async def send_signal_to_discord(
    message: str,
    webhook_url: Optional[str] = None,
    username: str = "StarkTrade AI",
    avatar_url: str = "https://i.imgur.com/7Q3kZqP.png",  # Replace with your logo
) -> int:
    """
    Send a signal message to a Discord channel via webhook.

    Args:
        message: The formatted signal message (supports Markdown)
        webhook_url: Discord webhook URL (falls back to DISCORD_WEBHOOK_URL env var)
        username: Display name for the bot message
        avatar_url: Profile picture URL for the bot message

    Returns:
        Message ID (extracted from response)

    Raises:
        ValueError: If webhook_url not configured
        httpx.HTTPError: If the Discord API request fails
    """
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")

    if not url:
        raise ValueError("DISCORD_WEBHOOK_URL not configured. Set it in .env or pass as argument.")

    # Discord webhook has an 2000 character limit for regular messages
    # But webhooks allow up to 10,000 chars with embeds. We'll use embed for long messages.
    if len(message) > 1900:
        # Use embed for long messages (Discord 2000 char limit for content)
        payload = {
            "username": username,
            "avatar_url": avatar_url,
            "embeds": [
                {
                    "title": "🤖 StarkTrade AI Signal",
                    "description": message[:3900],  # Discord embed description max ~4000
                    "color": 5814783,  # Gold color
                    "footer": {"text": "StarkTrade AI — Not financial advice"},
                }
            ],
        }
    else:
        payload = {
            "username": username,
            "avatar_url": avatar_url,
            "content": message,
        }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

    # Discord returns the created message object
    data = response.json()
    message_id = data.get("id", 0)
    logger.info(f"Signal sent to Discord, message_id={message_id}")
    return int(message_id)


async def send_discord_text(
    text: str,
    webhook_url: Optional[str] = None,
    username: str = "StarkTrade AI",
) -> int:
    """Send a plain text message to Discord (no embed)."""
    return await send_signal_to_discord(text, webhook_url=webhook_url, username=username)


async def send_signal_embed(
    symbol: str,
    direction: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
    confidence: float,
    rationale: str = "",
    webhook_url: Optional[str] = None,
    username: str = "StarkTrade AI",
) -> int:
    """
    Send a signal as a rich Discord embed (recommended for signals).

    Creates a professional-looking embed with fields for each signal parameter.
    """
    # Color: green for BUY, red for SELL
    color = 3066993 if direction == "BUY" else 15158332
    emoji = "🟢" if direction == "BUY" else "🔴"

    embed = {
        "title": f"{emoji} {direction} {symbol}",
        "color": color,
        "fields": [
            {"name": "Entry", "value": f"`${entry:,.2f}`", "inline": True},
            {"name": "Stop Loss", "value": f"`${stop_loss:,.2f}`", "inline": True},
            {"name": "Take Profit", "value": f"`${take_profit:,.2f}`", "inline": True},
            {"name": "Confidence", "value": f"{confidence:.0f}%", "inline": True},
        ],
        "footer": {"text": "StarkTrade AI — Not financial advice | Trade at your own risk"},
    }

    if rationale:
        embed["description"] = rationale[:3900]

    payload = {
        "username": username,
        "embeds": [embed],
    }

    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        raise ValueError("DISCORD_WEBHOOK_URL not configured.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

    data = response.json()
    message_id = data.get("id", 0)
    logger.info(f"Signal embed sent to Discord, message_id={message_id}")
    return int(message_id)


async def test_discord_connection() -> dict:
    """
    Test the Discord webhook connection by sending a test message.
    Returns a dict with connection status.
    """
    url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not url:
        return {"connected": False, "error": "DISCORD_WEBHOOK_URL not configured"}

    try:
        await send_discord_text(
            "🔗 **StarkTrade AI Connection Test**\n\nIf you see this, your Discord webhook is working correctly.",
            webhook_url=url,
        )
        return {"connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)}
