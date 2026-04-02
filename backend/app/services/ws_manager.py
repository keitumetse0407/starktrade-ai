"""WebSocket connection manager."""
import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {"default": set(), "agents": set()}

    async def connect(self, ws: WebSocket, channel: str = "default"):
        await ws.accept()
        self.active_connections.setdefault(channel, set()).add(ws)

    def disconnect(self, ws: WebSocket):
        for channel in self.active_connections.values():
            channel.discard(ws)

    async def broadcast(self, message: dict, channel: str = "default"):
        dead = set()
        for ws in self.active_connections.get(channel, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active_connections.get(channel, set()).discard(ws)

    async def handle_message(self, ws: WebSocket, data: str):
        try:
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "subscribe":
                channel = msg.get("channel", "default")
                self.active_connections.setdefault(channel, set()).add(ws)
                await ws.send_json({"type": "subscribed", "channel": channel})

            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})

        except json.JSONDecodeError:
            await ws.send_json({"type": "error", "message": "Invalid JSON"})
