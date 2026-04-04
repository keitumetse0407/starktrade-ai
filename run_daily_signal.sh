#!/bin/bash
cd /var/www/starktrade-ai
source venv/bin/activate
python3 -c "
import asyncio
from engine.orchestrator import SignalOrchestrator
from engine.discord_notifier import send_signal_to_discord
async def main():
    s = await SignalOrchestrator().generate_signal()
    if s and s.action:
        mid = await send_signal_to_discord(s.message)
        print(f'Signal sent: {s.action} @ {s.entry} msg={mid}')
    else:
        print('No consensus')
asyncio.run(main())
"
