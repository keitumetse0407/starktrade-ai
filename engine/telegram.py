"""Telegram notification utility for StarkTrade AI signal delivery.

Sends formatted signal messages to a Telegram channel or group.
Uses the Telegram Bot API (no external library needed).

Environment variables:
    TELEGRAM_BOT_TOKEN — Bot token from @BotFather
    TELEGRAM_CHAT_ID   — Channel/group ID (e.g. -1001234567890 for channels)
"""

import logging
import httpx
from typing import Optional
import os

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


async def send_signal_to_channel(
    message: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    parse_mode: str = "HTML",
    disable_notification: bool = False,
) -> int:
    """
    Send a signal message to a Telegram channel/group.

    Args:
        message: The formatted signal message (supports HTML formatting)
        bot_token: Telegram bot token (falls back to TELEGRAM_BOT_TOKEN env var)
        chat_id: Target chat ID (falls back to TELEGRAM_CHAT_ID env var)
        parse_mode: Message formatting — "HTML" or "MarkdownV2"
        disable_notification: If True, sends as silent message (no notification sound)

    Returns:
        The message_id of the sent message (for tracking)

    Raises:
        ValueError: If bot_token or chat_id not configured
        httpx.HTTPError: If the Telegram API request fails
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = chat_id or os.environ.get("TELEGRAM_CHAT_ID")

    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not configured. Set it in .env or pass as argument.")
    if not chat:
        raise ValueError("TELEGRAM_CHAT_ID not configured. Set it in .env or pass as argument.")

    url = TELEGRAM_API.format(token=token)

    # Telegram has a 4096 character message limit
    if len(message) > 4000:
        logger.warning(f"Signal message too long ({len(message)} chars), truncating to 4000")
        message = message[:3997] + "..."

    payload = {
        "chat_id": chat,
        "text": message,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
        "disable_notification": disable_notification,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

    data = response.json()
    if not data.get("ok"):
        error_msg = data.get("description", "Unknown Telegram API error")
        raise httpx.HTTPStatusError(
            message=f"Telegram API error: {error_msg}",
            request=response.request,
            response=response,
        )

    message_id = data["result"]["message_id"]
    logger.info(f"Signal sent to Telegram chat {chat}, message_id={message_id}")
    return message_id


async def send_telegram_text(
    text: str,
    bot_token: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> int:
    """Send a plain text message to Telegram (no formatting)."""
    return await send_signal_to_channel(text, bot_token=bot_token, chat_id=chat_id, parse_mode=None)


async def test_telegram_connection() -> dict:
    """
    Test the Telegram bot connection by sending a test message.
    Returns a dict with connection status.
    """
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")

    if not token or not chat:
        return {
            "connected": False,
            "error": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured",
        }

    try:
        message_id = await send_telegram_text(
            "🔗 *StarkTrade AI Connection Test*\n\nIf you see this, your Telegram integration is working correctly.",
            chat_id=chat,
            bot_token=token,
        )
        return {
            "connected": True,
            "message_id": message_id,
            "chat_id": chat,
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e),
        }
