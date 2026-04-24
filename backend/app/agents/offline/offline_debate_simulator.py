"""
Ultra Instinct Enhanced Debate Simulator
=======================================
Multi-agent debate with weighted voting - no external APIs.

Features:
- Weighted voting by reputation
- Confidence aggregation
- Dissent tracking
- Time-decayed reputation
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import time


@dataclass
class DebateAgent:
    name: str
    role: str
    weight: float
    reputation: float
    last_update: float
    history: List[Dict[str, Any]] = field(default_factory=list)


def _time_decay(reputation: float, last_update: float, half_life: float = 3600.0) -> float:
    """Time-decay reputation."""
    now = time.time()
    dt = now - last_update
    if dt <= 0:
        return reputation
    decay = 2 ** (-dt / half_life)
    return reputation * decay


def debate_enhanced(
    signal: Dict[str, Any],
    regime: Dict[str, Any],
    cfg: Dict[str, Any],
    agents_state: Optional[Dict[str, DebateAgent]] = None
) -> Dict[str, Any]:
    """
    Enhanced multi-agent debate with reputation-weighted voting.
    """
    # Initialize agents if not provided
    if agents_state is None:
        agents_state = {
            "Bull": DebateAgent("Bull", "Bull", 1.0, 1.0, time.time()),
            "Bear": DebateAgent("Bear", "Bear", 1.0, 1.0, time.time()),
            "Risk": DebateAgent("Risk", "Risk", 1.0, 1.0, time.time()),
            "Momentum": DebateAgent("Momentum", "Momentum", 1.0, 1.0, time.time()),
            "Skeptic": DebateAgent("Skeptic", "Skeptic", 1.0, 1.0, time.time()),
        }
    
    votes: Dict[str, float] = {"buy": 0.0, "sell": 0.0, "hold": 0.0}
    explanations: List[str] = []
    dissent: List[str] = []
    
    base_conf = float(signal.get("confidence", 0.5))
    sig = signal.get("signal", "hold")
    reg_conf = float(regime.get("confidence", 0.5))
    reg = regime.get("regime", "Sideways")
    
    half_life = cfg.get("half_life", 3600.0)
    min_debate_conf = cfg.get("min_debate_conf", 0.45)
    
    for role, agent in agents_state.items():
        rep = _time_decay(agent.reputation, agent.last_update, half_life)
        w = agent.weight * rep
        
        if role == "Bull":
            if sig == "buy":
                v = base_conf * (1.2 if reg == "Bull" else 1.0)
                votes["buy"] += v * w
                explanations.append(f"Bull: BUY (regime bull-supportive, conf {v:.2f})")
            else:
                votes["hold"] += 0.4 * w
                dissent.append("Bull dissent: prefers buy but signal not buy")
        
        elif role == "Bear":
            if sig == "sell":
                v = base_conf * (1.2 if reg == "Bear" else 1.0)
                votes["sell"] += v * w
                explanations.append(f"Bear: SELL (regime bear-supportive, conf {v:.2f})")
            else:
                votes["hold"] += 0.4 * w
                dissent.append("Bear dissent: prefers sell but signal not sell")
        
        elif role == "Risk":
            if sig == "hold" or base_conf < 0.5 or reg_conf < 0.5 or reg == "Crisis":
                votes["hold"] += 0.8 * w
                explanations.append("Risk: HOLD (low conf/regime risk)")
            else:
                if sig == "buy":
                    votes["buy"] += 0.5 * w
                else:
                    votes["sell"] += 0.5 * w
                dissent.append("Risk dissent: cautious but allows trade")
        
        elif role == "Momentum":
            if reg == "Bull" and sig == "buy":
                votes["buy"] += base_conf * 1.1 * w
                explanations.append("Momentum: BUY (bull momentum)")
            elif reg == "Bear" and sig == "sell":
                votes["sell"] += base_conf * 1.1 * w
                explanations.append("Momentum: SELL (bear momentum)")
            else:
                votes["hold"] += 0.3 * w
                dissent.append("Momentum dissent: momentum not aligned")
        
        elif role == "Skeptic":
            if base_conf < 0.6 or reg_conf < 0.6:
                votes["hold"] += 0.9 * w
                explanations.append("Skeptic: HOLD (insufficient evidence)")
            else:
                if sig == "buy":
                    votes["buy"] += 0.4 * w
                else:
                    votes["sell"] += 0.4 * w
                dissent.append("Skeptic dissent: allows trade but skeptical")
    
    # Calculate final signal
    total = votes["buy"] + votes["sell"] + votes["hold"]
    if total == 0:
        final = "hold"
        conf = 0.0
    else:
        final = max(votes, key=votes.get)
        conf = votes[final] / total
    
    # Minimum debate confidence
    if conf < min_debate_conf:
        final = "hold"
        conf = 0.3
    
    return {
        "final_signal": final,
        "confidence": round(conf, 2),
        "votes": votes,
        "explanations": explanations,
        "dissent": dissent,
        "agents_state": agents_state,
    }


# ============================================================
# SIMPLE DEBATE (Legacy compatibility)
# ============================================================

def debate_simple(signals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Simple debate - majority wins."""
    buy_count = sum(1 for s in signals if s.get("signal") == "buy")
    sell_count = sum(1 for s in signals if s.get("signal") == "sell")
    
    if buy_count > sell_count:
        return {"signal": "buy", "confidence": buy_count / len(signals)}
    elif sell_count > buy_count:
        return {"signal": "sell", "confidence": sell_count / len(signals)}
    else:
        return {"signal": "hold", "confidence": 0.3}