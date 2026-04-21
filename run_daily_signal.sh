#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
source backend/venv/bin/activate
python3 -c "
import asyncio
import sys
sys.path.append('./backend')
from app.agents.orchestrator import run_pipeline
from engine.discord_notifier import send_signal_to_discord
async def main():
    result = await run_pipeline('XAUUSD')
    # Extract signal from result - the orchestrator returns the full state
    # We need to get the final decision from the result
    final_decision = result.get('final_decision', {})
    if final_decision and isinstance(final_decision, dict) and final_decision.get('action') == 'execute':
        # Create a signal-like object for discord notification
        class SignalObj:
            def __init__(self, decision):
                self.action = decision.get('side', '').upper() if decision.get('side') else 'HOLD'
                self.entry = decision.get('entry_price', 0)
                self.message = str(decision)  # Simplified for now
        s = SignalObj(final_decision)
        if s.action in ['BUY', 'SELL']:
            mid = await send_signal_to_discord(s.message)
            print(f'Signal sent: {s.action} @ {s.entry} msg={mid}')
        else:
            print('No trade signal')
    else:
        print('No consensus or trade rejected')
asyncio.run(main())
"
