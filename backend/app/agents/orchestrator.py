import os
"""
LangGraph Multi-Agent Orchestrator — HRM-Enhanced
==================================================
Integrates Samsung's Hierarchical Reasoning Model:

SYSTEM 2 (Strategic Layer):
  - Market regime detection
  - Risk budget allocation
  - Multi-timeframe thesis

SYSTEM 1 (Tactical Layer):
  - Researcher (news/sentiment)
  - Strategist (value analysis)
  - Quant (technical signals)
  - Fundamentalist (financials)

GATEKEEPER: Risk Manager (has System 2 authority)

Flow: TRIGGER → SYSTEM 2 REGIME CHECK → PARALLEL SYSTEM 1 AGENTS →
      RISK GATE → SYNTHESIS → EXECUTION → FEEDBACK TO SYSTEM 2
"""

import json
from typing import TypedDict, Annotated, Sequence
from datetime import datetime, timezone
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from app.agents.hrm_engine import (
    hrm_engine, MarketRegime, TimeFrame, StrategicState, TacticalSignal
)


class AgentState(TypedDict):
    symbol: str
    # System 2 state
    market_regime: str
    regime_confidence: float
    aggression_multiplier: float
    risk_budget_remaining: float
    timeframe_alignment: float
    # System 1 outputs
    research_brief: dict
    strategy_recommendation: dict
    quant_signal: dict
    fundamental_report: dict
    # Gatekeeper
    risk_assessment: dict
    # Final
    final_decision: dict
    hrm_context: dict
    messages: list


llm = None

def get_llm():
    """Get Groq LLM instance - uses 70b for best reasoning."""
    global llm
    if not llm:
        api_key = os.getenv("GROQ_API_KEY", "")
        if api_key:
            llm = ChatGroq(
                model="llama-3.1-70b-versatile",
                api_key=api_key,
                temperature=0.1,
                max_tokens=800,
            )
    return llm


# ============================================================
# SYSTEM 2 NODE: Regime Detection & Risk Budget
# ============================================================
async def system2_regime_node(state: AgentState) -> dict:
    """
    System 2: Detect market regime, set risk budget, provide context.
    This runs FIRST and constrains all subsequent System 1 decisions.
    """
    # Real market data from market pulse service
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get("http://localhost:8000/api/v1/market/pulse")
            pulse = r.json() if r.status_code == 200 else {}
    except Exception:
        pulse = {}
    market_data = {
        "vix": pulse.get("VIX", {}).get("price", 20.0),
        "sp500_20d_return_pct": pulse.get("SPX", {}).get("change_pct", 0.0),
        "market_breadth_pct": 55,
        "yield_curve_slope": 0.3,
    }
    
    # Run System 2 regime detection
    regime = await hrm_engine.update_regime(market_data)
    
    # Set risk budget based on regime
    if regime == MarketRegime.CRISIS:
        hrm_engine.set_risk_budget(total_pct=0.5, max_per_trade_pct=1.0)
    elif regime == MarketRegime.BEAR:
        hrm_engine.set_risk_budget(total_pct=1.5, max_per_trade_pct=3.0)
    elif regime == MarketRegime.TRANSITION:
        hrm_engine.set_risk_budget(total_pct=1.0, max_per_trade_pct=2.0)
    elif regime == MarketRegime.SIDEWAYS:
        hrm_engine.set_risk_budget(total_pct=2.5, max_per_trade_pct=4.0)
    else:  # BULL
        hrm_engine.set_risk_budget(total_pct=4.0, max_per_trade_pct=5.0)
    
    # Get System 2 context for all agents
    ctx = hrm_engine.get_system2_context()
    
    return {
        "market_regime": regime.value,
        "regime_confidence": ctx["regime_confidence"],
        "aggression_multiplier": ctx["aggression_multiplier"],
        "risk_budget_remaining": ctx["risk_budget_remaining_pct"],
        "timeframe_alignment": ctx["timeframe_alignment"],
        "hrm_context": ctx,
    }


# ============================================================
# SYSTEM 1 AGENTS (Parallel, operate within System 2 constraints)
# ============================================================

async def researcher_node(state: AgentState) -> dict:
    """System 1: The Researcher — News & sentiment analysis."""
    regime = state.get("market_regime", "sideways")
    aggression = state.get("aggression_multiplier", 0.5)
    
    prompt = f"""You are THE RESEARCHER. Bloomberg terminal that never sleeps.

CURRENT MARKET REGIME: {regime.upper()}
AGGRESSION LEVEL: {aggression:.0%} (set by System 2 strategic layer)

Analyze {state['symbol']} across all dimensions:
1. Recent news sentiment (bullish/bearish/neutral)
2. SEC filings and insider activity
3. Economic calendar impacts
4. On-chain analytics (if crypto)
5. Sector rotation trends
6. Macro environment assessment

IMPORTANT: In {regime} regime, your analysis should reflect:
{"- Focus on downside risks and hedging" if regime in ("bear", "crisis") else ""}
{"- Look for mean-reversion opportunities" if regime == "sideways" else ""}
{"- Ride momentum, don't fight the trend" if regime == "bull" else ""}
{"- Be cautious, wait for confirmation" if regime == "transition" else ""}

Output JSON:
- overall_sentiment: "bullish"|"bearish"|"neutral"
- confidence: 0.0-1.0
- key_findings: list of 3-5 bullet points
- risks: list of identified risks
- catalysts: upcoming catalysts
- regime_alignment: how well does this fit the current {regime} regime?
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You are a world-class financial research analyst."),
        HumanMessage(content=prompt),
    ])

    return {"research_brief": {"analysis": response.content, "agent": "researcher", "regime_aware": True}}


async def strategist_node(state: AgentState) -> dict:
    """System 1: The Strategist — Munger/Buffett value analysis."""
    regime = state.get("market_regime", "sideways")
    aggression = state.get("aggression_multiplier", 0.5)
    
    prompt = f"""You are THE STRATEGIST. You think like Charlie Munger and Warren Buffett.

MARKET REGIME: {regime.upper()} | AGGRESSION: {aggression:.0%}

Research Brief:
{json.dumps(state.get('research_brief', {}), indent=2)}

Before recommending any trade, you MUST answer:
1. What is the intrinsic value? (DCF analysis)
2. Is there ≥30% margin of safety?
3. What is the economic moat score (1-10)?
4. Is there a better opportunity cost?
5. What would Munger say? (inversion)
6. Is this within circle of competence?

REGIME-SPECIFIC GUIDANCE:
{"In BEAR/CRISIS: Only recommend if margin of safety >50%. Cash is a position." if regime in ("bear", "crisis") else ""}
{"In SIDEWAYS: Look for value traps vs genuine opportunities." if regime == "sideways" else ""}
{"In BULL: Don't chase. Wait for pullbacks to fair value." if regime == "bull" else ""}
{"In TRANSITION: Be extra conservative. Uncertainty = wider margins needed." if regime == "transition" else ""}

Output JSON:
- recommendation: "buy"|"sell"|"hold"
- conviction_score: 1-10
- intrinsic_value: estimated fair value
- margin_of_safety_pct: percentage
- moat_score: 1-10
- munger_says: his likely opinion
- reasoning: detailed explanation
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You are a value investing strategist with Munger/Buffett discipline."),
        HumanMessage(content=prompt),
    ])

    return {"strategy_recommendation": {"analysis": response.content, "agent": "strategist", "regime_aware": True}}


async def quant_node(state: AgentState) -> dict:
    """System 1: The Quant — Jim Simons cold precision."""
    regime = state.get("market_regime", "sideways")
    aggression = state.get("aggression_multiplier", 0.5)
    alignment = state.get("timeframe_alignment", 0)
    
    prompt = f"""You are THE QUANT. Jim Simons' cold precision. "We don't override the models."

MARKET REGIME: {regime.upper()} | AGGRESSION: {aggression:.0%}
TIMEFRAME ALIGNMENT: {alignment:.2f} (-1=bearish, +1=bullish)

Analyze {state['symbol']} using quantitative methods:
1. Statistical arbitrage signals
2. Mean reversion indicators  
3. ML pattern recognition
4. Sharpe ratio estimation (target >1.5)
5. Max drawdown estimation (target <15%)
6. Portfolio correlation check (<0.7)
7. Monte Carlo simulation summary
8. Technical indicators: RSI, MACD, Bollinger Bands, ATR

REGIME-SPECIFIC MODELS:
{"CRISIS: Use fat-tailed distributions. VaR/CVaR focus." if regime == "crisis" else ""}
{"BEAR: Momentum reversal models. Short signals weighted higher." if regime == "bear" else ""}
{"SIDEWAYS: Mean-reversion models. Bollinger Band strategies." if regime == "sideways" else ""}
{"BULL: Momentum models. Trend-following strategies." if regime == "bull" else ""}

Strategy context:
{json.dumps(state.get('strategy_recommendation', {}), indent=2)}

Output JSON:
- signal: "buy"|"sell"|"hold"
- confidence_interval: [lower, upper]
- expected_sharpe: float
- expected_max_dd: float
- entry_points: list of price levels
- stop_loss: price
- take_profit: price
- technical_summary: dict of indicator values
- regime_model_used: which model was primary
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You are a quantitative analyst modeled after Jim Simons."),
        HumanMessage(content=prompt),
    ])

    return {"quant_signal": {"analysis": response.content, "agent": "quant", "regime_aware": True}}


async def fundamentalist_node(state: AgentState) -> dict:
    """System 1: The Fundamentalist — Forensic financial analysis."""
    regime = state.get("market_regime", "sideways")
    
    prompt = f"""You are THE FUNDAMENTALIST. You read 10-Ks like novels.

MARKET REGIME: {regime.upper()}

Analyze {state['symbol']} fundamentals:
1. Revenue CAGR (3-5 year)
2. Free Cash Flow yield
3. Debt/Equity ratio
4. Insider buying/selling patterns
5. Moat scoring (brand, network effects, switching costs, cost advantage, scale)
6. Management quality assessment
7. Competitive landscape

REGIME-SPECIFIC FOCUS:
{"CRISIS: Focus on balance sheet survival. Cash runway, debt maturity schedule." if regime == "crisis" else ""}
{"BEAR: Focus on downside protection. Dividend safety, debt coverage." if regime == "bear" else ""}
{"BULL: Focus on growth runway. TAM expansion, competitive moat deepening." if regime == "bull" else ""}

For crypto:
1. Tokenomics analysis
2. TVL trends
3. GitHub development activity
4. Daily active addresses
5. Token utility and supply dynamics

Output JSON:
- fair_value_estimate: float
- revenue_cagr: float
- fcf_yield: float
- de_ratio: float
- moat_score: 1-10
- insider_sentiment: "bullish"|"bearish"|"neutral"
- management_score: 1-10
- recommendation: "buy"|"sell"|"hold"
- reasoning: string
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You are a forensic financial analyst."),
        HumanMessage(content=prompt),
    ])

    return {"fundamental_report": {"analysis": response.content, "agent": "fundamentalist", "regime_aware": True}}


# ============================================================
# RISK MANAGER: System 2 Gatekeeper
# ============================================================
async def risk_manager_node(state: AgentState) -> dict:
    """
    The Risk Manager — System 2 authority. FINAL GATEKEEPER.
    Has the power to override any System 1 agent.
    """
    regime = state.get("market_regime", "sideways")
    aggression = state.get("aggression_multiplier", 0.5)
    budget_remaining = state.get("risk_budget_remaining", 2.0)
    
    prompt = f"""You are THE RISK MANAGER. Ray Dalio's shield. NO trade passes without your approval.

YOU HAVE SYSTEM 2 AUTHORITY — you can override any agent.

MARKET REGIME: {regime.upper()}
AGGRESSION MULTIPLIER: {aggression:.0%}
RISK BUDGET REMAINING: {budget_remaining:.1f}%

Evaluate the proposed trade for {state['symbol']}:

Strategy:
{json.dumps(state.get('strategy_recommendation', {}), indent=2)}

Quant Signal:
{json.dumps(state.get('quant_signal', {}), indent=2)}

Fundamental Report:
{json.dumps(state.get('fundamental_report', {}), indent=2)}

RULES (NEVER VIOLATE):
1. Max {state.get('hrm_context', {}).get('max_position_pct', 5)}% position size (System 2 limit)
2. Total risk budget: {budget_remaining:.1f}% remaining
3. 8% drawdown = halt ALL trading
4. Portfolio beta ≤1.5
5. Minimum 2:1 risk/reward ratio
6. Must survive any economic regime

REGIME-SPECIFIC RULES:
{"CRISIS: Max 1% position. 95% cash minimum. Only hedges allowed." if regime == "crisis" else ""}
{"BEAR: Max 3% position. Favor shorts and hedges." if regime == "bear" else ""}
{"SIDEWAYS: Max 4% position. Mean-reversion strategies only." if regime == "sideways" else ""}
{"BULL: Max 5% position. Momentum strategies favored." if regime == "bull" else ""}
{"TRANSITION: Max 2% position. High conviction only." if regime == "transition" else ""}

NASSIM TALEB BLACK SWAN CHECK:
- Is there a tail risk hedge in place?
- Does the position survive a -3σ event?
- Barbell allocation maintained (90% safe, 10% risky)?

Output JSON:
- decision: "APPROVED"|"REJECTED"|"MODIFIED"
- risk_score: 1-100 (100 = safest)
- position_size_pct: recommended % of portfolio
- stop_loss_pct: recommended stop loss %
- reasoning: detailed explanation
- required_modifications: list of changes if MODIFIED
- regime_risk_note: specific risk for this regime
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You are the ultimate risk manager. You protect capital above all else. You have System 2 authority to override any agent."),
        HumanMessage(content=prompt),
    ])

    return {"risk_assessment": {"analysis": response.content, "agent": "risk_manager", "system2_authority": True}}


# ============================================================
# SYNTHESIZER: Final Decision
# ============================================================
async def synthesizer_node(state: AgentState) -> dict:
    """Combine all agent outputs + System 2 context into final decision."""
    regime = state.get("market_regime", "sideways")
    ctx = state.get("hrm_context", {})
    
    prompt = f"""You are the SYNTHESIZER. Combine all analyses into a final trading decision.

MARKET REGIME: {regime.upper()}
SYSTEM 2 CONTEXT: {json.dumps(ctx, indent=2)}

Research: {json.dumps(state.get('research_brief', {}))}
Strategy: {json.dumps(state.get('strategy_recommendation', {}))}
Quant: {json.dumps(state.get('quant_signal', {}))}
Fundamental: {json.dumps(state.get('fundamental_report', {}))}
Risk: {json.dumps(state.get('risk_assessment', {}))}

The Risk Manager has SYSTEM 2 AUTHORITY. If they rejected, the trade is rejected.
The regime ({regime}) should heavily influence the final decision.

Output JSON:
- action: "execute"|"reject"|"hold"
- symbol: str
- side: "buy"|"sell"|null
- quantity_pct: float (position size as % of portfolio)
- entry_price: float|null
- stop_loss: float|null
- take_profit: float|null
- confidence: 1-10
- council_summary: string (what each agent said in 1 line each)
- final_reasoning: string
- regime_context: how the {regime} regime influenced this decision
"""

    groq_llm = get_llm()
    if not groq_llm:
        return {"final_decision": {"analysis": "No Groq API key configured"}}
    response = await groq_llm.ainvoke([
        SystemMessage(content="You synthesize multi-agent analysis into actionable trading decisions."),
        HumanMessage(content=prompt),
    ])

    return {"final_decision": {"analysis": response.content, "regime": regime}}


# ============================================================
# GRAPH CONSTRUCTION
# ============================================================
def should_continue(state: AgentState) -> str:
    risk = state.get("risk_assessment", {})
    if "REJECTED" in str(risk.get("analysis", "")):
        return "synthesis"
    return "synthesis"


def build_graph():
    graph = StateGraph(AgentState)

    # System 2 node (runs first)
    graph.add_node("system2_regime", system2_regime_node)
    
    # System 1 nodes (parallel after System 2)
    graph.add_node("researcher", researcher_node)
    graph.add_node("strategist", strategist_node)
    graph.add_node("quant", quant_node)
    graph.add_node("fundamentalist", fundamentalist_node)
    
    # Gatekeeper + Synthesis
    graph.add_node("risk_manager", risk_manager_node)
    graph.add_node("synthesizer", synthesizer_node)

    # Flow: System 2 first, then parallel System 1
    graph.set_entry_point("system2_regime")
    
    # System 2 fans out to all System 1 agents
    graph.add_edge("system2_regime", "researcher")
    graph.add_edge("system2_regime", "strategist")
    graph.add_edge("system2_regime", "quant")
    graph.add_edge("system2_regime", "fundamentalist")
    
    # System 1 agents feed into Risk Manager (System 2 gatekeeper)
    graph.add_edge("researcher", "risk_manager")
    graph.add_edge("strategist", "risk_manager")
    graph.add_edge("quant", "risk_manager")
    graph.add_edge("fundamentalist", "risk_manager")
    
    # Risk Manager → Synthesizer
    graph.add_conditional_edges("risk_manager", should_continue, {
        "synthesis": "synthesizer",
    })
    
    graph.add_edge("synthesizer", END)

    return graph.compile()


pipeline = build_graph()


async def run_pipeline(symbol: str = "SPY"):
    """Run the HRM-enhanced agent pipeline for a symbol."""
    initial_state = AgentState(
        symbol=symbol,
        market_regime="sideways",
        regime_confidence=0.5,
        aggression_multiplier=0.5,
        risk_budget_remaining=2.0,
        timeframe_alignment=0.0,
        research_brief={},
        strategy_recommendation={},
        quant_signal={},
        fundamental_report={},
        risk_assessment={},
        final_decision={},
        hrm_context={},
        messages=[],
    )

    result = await pipeline.ainvoke(initial_state)
    return result
