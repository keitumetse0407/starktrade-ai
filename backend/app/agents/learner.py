"""
Learner Agent — HRM-Enhanced Weekly Review & Self-Improvement
==============================================================
Integrates with the Hierarchical Reasoning Module feedback loop.

The Learner feeds outcomes back to System 2, which adjusts:
- Risk budgets
- Aggression multipliers
- Regime detection thresholds
- Agent weight distribution

This is the KEY HRM innovation: temporal reasoning across timescales.
  - System 1: Minutes/hours (tactical)
  - System 2: Days/weeks (strategic)
  - Learner: Weeks/months (meta-strategic)
"""

from app.agents.orchestrator import llm
from app.agents.hrm_engine import hrm_engine
from langchain_core.messages import SystemMessage, HumanMessage
from app.db.session import async_session_factory
from app.db.models import Trade, Agent, AgentDecision
from sqlalchemy import select, func
from datetime import datetime, timedelta


async def run_weekly_review():
    """
    Weekly review: analyze past trades, adjust agent weights, generate lessons.
    Feeds outcomes back to HRM System 2 for strategic adjustment.
    """
    async with async_session_factory() as db:
        week_ago = datetime.utcnow() - timedelta(days=7)

        result = await db.execute(
            select(Trade).where(
                Trade.status == "executed",
                Trade.created_at >= week_ago,
            )
        )
        trades = result.scalars().all()

        if not trades:
            return {"status": "no_trades_to_review"}

        # Categorize trades by regime they were executed in
        trade_summary = []
        wins = 0
        losses = 0
        total_pnl = 0
        
        for t in trades:
            pnl = float(t.pnl or 0)
            is_win = pnl > 0
            if is_win:
                wins += 1
            else:
                losses += 1
            total_pnl += pnl
            
            trade_summary.append({
                "symbol": t.symbol,
                "side": t.side,
                "pnl": pnl,
                "win": is_win,
                "reasoning": t.reasoning or "",
                "risk_score": t.risk_score,
            })

        win_rate = wins / len(trades) if trades else 0

        prompt = f"""You are THE LEARNER with HRM (Hierarchical Reasoning Model) integration.

This week's performance:
- Total trades: {len(trades)}
- Win rate: {win_rate:.1%}
- Total P&L: ${total_pnl:,.2f}

Trades:
{trade_summary}

HRM SYSTEM 2 CONTEXT:
Current regime: {hrm_engine.strategic.regime.value}
Current risk budget: {hrm_engine.strategic.risk_budget_pct:.1f}%
Current aggression: {hrm_engine.strategic.get_aggression_multiplier():.0%}

Analyze:
1. Which trades were winners and why?
2. Which trades were losers and why?
3. What patterns emerge across winners vs losers?
4. Which agent contributed most to winning trades?
5. Did the System 2 regime assessment match reality?
6. Should the risk budget be increased or decreased?
7. Should the aggression multiplier change?

HRM FEEDBACK LOOP — Propose adjustments:
- If win rate >70%: Consider increasing risk budget
- If win rate <40%: Decrease risk budget, increase caution
- If regime assessment was wrong: Flag for regime model recalibration
- If certain agents consistently win/lose: Adjust their weight

Output JSON:
- lessons: list of key takeaways (5 max)
- agent_weight_adjustments: dict of agent → multiplier (0.5 to 1.5)
- hrm_adjustments: {
    "risk_budget_change_pct": float,
    "aggression_multiplier_adjustment": float,
    "regime_recalibration_needed": bool,
    "regime_recalibration_reason": string
  }
- performance_score: 1-10 for the week
- next_week_recommendation: string
"""

        response = await llm.ainvoke([
            SystemMessage(content="""You are a reflective trading system that learns from every trade.
You integrate with a Hierarchical Reasoning Model (HRM) that has two levels:
- System 2 (Strategic): Sets regime, risk budgets, constraints
- System 1 (Tactical): Executes trades within System 2's boundaries
You provide the feedback loop that helps System 2 improve over time."""),
            HumanMessage(content=prompt),
        ])

        # Feed outcomes to HRM feedback loop
        for t in trades:
            hrm_engine.record_outcome(
                signal=None,  # Historical signal, not available
                outcome={
                    "pnl": float(t.pnl or 0),
                    "win": (t.pnl or 0) > 0,
                    "symbol": t.symbol,
                }
            )
        
        # Run HRM strategic review
        hrm_review = await hrm_engine.strategic_review()

        return {
            "status": "review_complete",
            "trades_reviewed": len(trades),
            "win_rate": win_rate,
            "total_pnl": total_pnl,
            "ai_analysis": response.content,
            "hrm_review": hrm_review,
        }


async def run_monthly_deep_review():
    """
    Monthly deep review: longer-term pattern analysis.
    This is the META-strategic layer — reviewing System 2 itself.
    """
    async with async_session_factory() as db:
        month_ago = datetime.utcnow() - timedelta(days=30)

        result = await db.execute(
            select(Trade).where(
                Trade.status == "executed",
                Trade.created_at >= month_ago,
            )
        )
        trades = result.scalars().all()

        if not trades:
            return {"status": "no_trades_to_review"}

        # Monthly metrics
        total_pnl = sum(float(t.pnl or 0) for t in trades)
        wins = sum(1 for t in trades if (t.pnl or 0) > 0)
        win_rate = wins / len(trades)
        
        prompt = f"""You are THE LEARNER conducting a MONTHLY DEEP REVIEW.

This is the META-STRATEGIC layer — you're reviewing System 2's performance.

Monthly Performance:
- Total trades: {len(trades)}
- Win rate: {win_rate:.1%}
- Total P&L: ${total_pnl:,.2f}

Questions to answer:
1. Was System 2's regime detection accurate this month?
2. Were risk budgets appropriate (too tight or too loose)?
3. Did the aggression multiplier match market conditions?
4. What regime transitions happened and were they caught in time?
5. What should change at the System 2 level next month?

Output JSON:
- regime_accuracy_score: 1-10
- risk_budget_assessment: "too_tight"|"appropriate"|"too_loose"
- aggression_assessment: "too_conservative"|"appropriate"|"too_aggressive"
- key_insights: list of 3-5 meta-level insights
- system2_recommendations: specific changes to System 2 parameters
- monthly_performance_score: 1-10
"""

        response = await llm.ainvoke([
            SystemMessage(content="You conduct meta-strategic reviews of the Hierarchical Reasoning Model."),
            HumanMessage(content=prompt),
        ])

        return {
            "status": "monthly_review_complete",
            "trades_reviewed": len(trades),
            "win_rate": win_rate,
            "total_pnl": total_pnl,
            "analysis": response.content,
        }
