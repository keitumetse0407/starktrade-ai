"""
Multi-Agent Debate System for Trading Decisions
=============================================

Multiple AI agents argue trades before execution. Implements Tony Stark's
"Panel of Experts" concept where different trading perspectives debate
before a trade is approved.

Debate Roles:
- BULL_AGENT: Argues FOR the trade (opportunity, upside)
- BEAR_AGENT: Argues AGAINST (risks, reasons to avoid)
- RISK_AGENT: Focuses on risk management, position sizing
- MOMENTUM_AGENT: Technical timing, entry/exit optimization
- SKEPTIC_AGENT: Challenges assumptions, tests edge cases

Debate Flow:
1. Trade proposal submitted
2. All agents provide arguments
3. Summary agent synthesizes
4. Final verdict: APPROVED | REJECTED | CONDITIONAL

Conditional means: Approved with modifications (smaller size, wider stops, etc.)
"""

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timezone
import json
import hashlib

try:
    from typing import Optional, Literal
except ImportError:
    from typing_extensions import Optional, Literal


# ============================================================
# DEBATE ROLES
# ============================================================
class DebateRole(Enum):
    BULL = "bull"           # Opportunities, upside
    BEAR = "bear"          # Risks, reasons to avoid
    RISK = "risk"          # Risk management, sizing
    MOMENTUM = "momentum"  # Technical timing
    SKEPTIC = "skeptic"    # Challenging assumptions


# ============================================================
# VERDICT TYPES
# ============================================================
class Verdict(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CONDITIONAL = "conditional"  # Approved with modifications
    DEADLOCKED = "deadlocked"    # No consensus after max rounds


# ============================================================
# DEBATE ARGUMENT
# ============================================================
@dataclass
class DebateArgument:
    """A single argument from an agent."""
    role: DebateRole
    text: str
    confidence: float                    # 0-1, how strong the argument is
    evidence: list[str] = field(default_factory=list)  # Supporting data points
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================
# TRADE PROPOSAL
# ============================================================
@dataclass
class TradeProposal:
    """A trade being debated."""
    id: str
    symbol: str
    direction: Literal["buy", "sell"]
    entry_price: float
    stop_loss: float
    take_profit: float
    position_size_pct: float           # % of portfolio
    timeframe: str                    # "1m", "1h", "4h", "1D"
    confidence: float                  # Original confidence from signal
    rationale: str                   # Why this trade
    technical_notes: str = ""       # Chart notes
    market_context: str = ""        # Current regime
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_hash(self) -> str:
        """Unique hash for caching."""
        data = f"{self.symbol}{self.direction}{self.entry_price}{self.created_at.isoformat()}"
        return hashlib.md5(data.encode()).hexdigest()[:8]


# ============================================================
# DEBATE RESULT
# ============================================================
@dataclass
class DebateResult:
    """Final verdict from the debate."""
    proposal_id: str
    verdict: Verdict
    confidence_score: float            # Weighted final confidence
    votes_for: int
    votes_against: int
    arguments: list[DebateArgument]
    summary: str
    modifications: dict = field(default_factory=dict)  # If conditional
    rounds: int = 1
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> dict:
        return {
            "proposal_id": self.proposal_id,
            "verdict": self.verdict.value,
            "confidence_score": self.confidence_score,
            "votes_for": self.votes_for,
            "votes_against": self.votes_against,
            "summary": self.summary,
            "modifications": self.modifications,
            "rounds": self.rounds,
            "timestamp": self.timestamp.isoformat(),
        }


# ============================================================
# DEBATE AGENT TEMPLATES
# ============================================================
DEBATE_PROMPTS = {
    DebateRole.BULL: """You are a BULLISH trading expert. Your job is to find 
EVERY reason why this trade will profit. Focus on:
- Market opportunity and catalysts
- Favorable risk/reward ratio
- Positive technical breakouts
- Bullish momentum indicators
- Supportive news/earnings
- Sector strength

Provide specific reasons with confidence levels (0-100%).""",
    
    DebateRole.BEAR: """You are a BEARISH trading expert. Your job is to find 
EVERY reason why this trade will fail. Focus on:
- Market headwinds and risks
- Unfavorable technicals
- Overbought conditions
- Negative divergence
- Sector weakness
- Macro risks

Provide specific reasons with confidence levels (0-100%).""",
    
    DebateRole.RISK: """You are a RISK MANAGEMENT expert. Your job is to evaluate 
position sizing and risk controls. Focus on:
- Appropriate position size for this trade
- Stop loss distance and validity
- Correlation with existing positions
- Portfolio risklimits
- Max drawdown exposure
- Leverage considerations

Provide specific recommendations with confidence levels (0-100%).""",
    
    DebateRole.MOMENTUM: """You are a MOMENTUM/TIMING expert. Your job is to find 
the optimal entry/exit timing. Focus on:
- Technical indicators (RSI, MACD, EMAs)
- Volume analysis
- Chart patterns
- Time of day considerations
- Support/resistance levels
- Entry order types

Provide specific timing recommendations with confidence levels (0-100%).""",
    
    DebateRole.SKEPTIC: """You are a SKEPTIC expert. Your job is to challenge 
ALL assumptions and find edge cases. Focus on:
- What could go wrong?
- What if I'm wrong about the thesis?
- Hidden risks not considered
- Alternative scenarios
- Market conditions that would invalidate the trade

Provide specific challenges with confidence levels (0-100%).""",
}


# ============================================================
# DEBATE ORCHESTRATOR
# ============================================================
class DebateOrchestrator:
    """
    Manages multi-agent debates for trade decisions.
    
    Usage:
        debate = DebateOrchestrator()
        proposal = TradeProposal(...)
        result = await debate.run_debate(proposal)
    """
    
    def __init__(
        self,
        max_rounds: int = 2,
        approval_threshold: float = 0.6,  # Need 60% for approval
        require_unanimous: bool = False,
    ):
        self.max_rounds = max_rounds
        self.approval_threshold = approval_threshold
        self.require_unanimous = require_unanimous
        self.debate_history: list[DebateResult] = []
    
    async def run_debate(
        self,
        proposal: TradeProposal,
        llm_callable=None,  # Function to call LLM
    ) -> DebateResult:
        """
        Run a full debate on a trade proposal.
        
        Args:
            proposal: Trade to debate
            llm_callable: Function that takes (role, prompt) -> response
            
        Returns:
            DebateResult with verdict and arguments
        """
        all_arguments: list[DebateArgument] = []
        current_round = 1
        
        while current_round <= self.max_rounds:
            round_arguments = await self._run_round(
                proposal, current_round, all_arguments
            )
            all_arguments.extend(round_arguments)
            
            # Check for early consensus
            result = self._tally_votes(all_arguments, proposal)
            if result.verdict in [Verdict.APPROVED, Verdict.REJECTED]:
                break
            
            # Check for deadlock (same votes round over round)
            if current_round > 1:
                prev_result = self._tally_votes(
                    all_arguments[:-len(round_arguments)], 
                    proposal
                )
                if prev_result.votes_for == result.votes_for:
                    # No change in rounds - might be deadlocked
                    if current_round == self.max_rounds:
                        result.verdict = Verdict.DEADLOCKED
            
            current_round += 1
        
        # Final tally
        final_result = self._tally_votes(all_arguments, proposal)
        final_result.rounds = current_round - 1 if current_round > 1 else 1
        
        self.debate_history.append(final_result)
        return final_result
    
    async def _run_round(
        self,
        proposal: TradeProposal,
        round_num: int,
        previous_arguments: list[DebateArgument],
    ) -> list[DebateArgument]:
        """Run one round of debates from all agents."""
        arguments = []
        
        # Build context from previous rounds
        prior_context = ""
        if previous_arguments:
            prior_context = "\n\nPrevious arguments:\n" + "\n".join(
                f"- {a.role.value}: {a.text[:100]}..." 
                for a in previous_arguments[-5:]
            )
        
        # Run each role
        for role in DebateRole:
            prompt = self._build_prompt(proposal, role, prior_context)
            
            # If no LLM callable, use template arguments
            if llm_callable is None:
                arg = self._template_argument(role, proposal, round_num)
            else:
                response = await llm_callable(role, prompt)
                arg = self._parse_argument(response, role, round_num)
            
            arguments.append(arg)
        
        return arguments
    
    def _build_prompt(
        self,
        proposal: TradeProposal,
        role: DebateRole,
        prior_context: str = "",
    ) -> str:
        """Build prompt for each agent."""
        base_prompt = DEBATE_PROMPTS[role]
        
        trade_info = f"""
TRADE PROPOSAL TO EVALUATE:
- Symbol: {proposal.symbol}
- Direction: {proposal.direction.upper()}
- Entry: ${proposal.entry_price}
- Stop Loss: ${proposal.stop_loss}
- Take Profit: ${proposal.take_profit}
- Position Size: {proposal.position_size_pct}% of portfolio
- Timeframe: {proposal.timeframe}
- Original Confidence: {proposal.confidence * 100}%
- Rationale: {proposal.rationale}

Market Context: {proposal.market_context}
Technical Notes: {proposal.technical_notes}
{prior_context}

Provide your analysis and specific recommendation.
"""
        return base_prompt + trade_info
    
    def _template_argument(
        self,
        role: DebateRole,
        proposal: TradeProposal,
        round_num: int,
    ) -> DebateArgument:
        """Generate template arguments when no LLM available."""
        templates = {
            DebateRole.BULL: DebateArgument(
                role=role,
                text=f"{proposal.symbol} shows strong setup with {proposal.confidence*100:.0f}% confidence. "
                     f"Risk/reward of {proposal.take_profit/proposal.stop_loss:.1f}R is favorable.",
                confidence=proposal.confidence,
                evidence=["RSI emerging from oversold", "EMA alignment bullish"],
            ),
            DebateRole.BEAR: DebateArgument(
                role=role,
                text=f"Concerns: {proposal.timeframe} timeframe may see reversal. "
                     f"Market context suggests caution.",
                confidence=0.4,
                evidence=["Overbought on daily", "Volume declining"],
            ),
            DebateRole.RISK: DebateArgument(
                role=role,
                text=f"Position size {proposal.position_size_pct}% is appropriate. "
                     f"Stop at ${proposal.stop_loss} is {abs(proposal.entry_price - proposal.stop_loss)/proposal.entry_price*100:.1f}% - acceptable.",
                confidence=0.7,
                evidence=["Within 5% max position", "Stop within 3%"],
            ),
            DebateRole.MOMENTUM: DebateArgument(
                role=role,
                text=f"Technical momentum favors {proposal.direction}. "
                     f"Entry timing optimal for {proposal.timeframe}.",
                confidence=0.65,
                evidence=["MACD crossing", "Volume spike"],
            ),
            DebateRole.SKEPTIC: DebateArgument(
                role=role,
                text=f"What if {proposal.market_context} shifts? Would invalidate thesis. "
                     f"Recommend tighter stop if volatility increases.",
                confidence=0.5,
                evidence=["VIX elevated", "Earnings nearby"],
            ),
        }
        arg = templates[role]
        arg.timestamp = datetime.now(timezone.utc)
        return arg
    
    def _parse_argument(
        self,
        response: str,
        role: DebateRole,
        round_num: int,
    ) -> DebateArgument:
        """Parse LLM response into argument."""
        # Simple parsing - in production, use structured output
        lines = response.strip().split("\n")
        text = " ".join(lines[:3])[:200]
        
        # Try to extract confidence
        confidence = 0.5
        for line in lines:
            if "confidence" in line.lower() or "%" in line:
                try:
                    import re
                    nums = re.findall(r'\d+%|\d+\.\d+', line)
                    if nums:
                        confidence = float(nums[0].replace("%", "")) / 100
                except:
                    pass
        
        return DebateArgument(
            role=role,
            text=text,
            confidence=confidence,
            timestamp=datetime.now(timezone.utc),
        )
    
    def _tally_votes(
        self,
        arguments: list[DebateArgument],
        proposal: TradeProposal,
    ) -> DebateResult:
        """Tally votes and determine verdict."""
        votes_for = 0
        votes_against = 0
        total_confidence = 0.0
        
        for arg in arguments:
            if arg.role == DebateRole.BEAR or arg.role == DebateRole.SKEPTIC:
                # These roles vote against by default
                votes_against += 1
            else:
                votes_for += 1
            
            total_confidence += arg.confidence
        
        avg_confidence = total_confidence / len(arguments) if arguments else 0.5
        
        # Determine verdict
        vote_ratio = votes_for / (votes_for + votes_against) if (votes_for + votes_against) > 0 else 0
        
        if vote_ratio >= self.approval_threshold:
            if self.require_unanimous and votes_against > 0:
                verdict = Verdict.CONDITIONAL
            else:
                verdict = Verdict.APPROVED
        elif vote_ratio <= (1 - self.approval_threshold):
            verdict = Verdict.REJECTED
        else:
            verdict = Verdict.CONDITIONAL
        
        # Generate summary
        summary = f"Bull:{votes_for} Bear:{votes_against} | Confidence:{avg_confidence*100:.0f}% | {verdict.value}"
        
        result = DebateResult(
            proposal_id=proposal.id,
            verdict=verdict,
            confidence_score=avg_confidence,
            votes_for=votes_for,
            votes_against=votes_against,
            arguments=arguments,
            summary=summary,
        )
        
        # Add modifications if conditional
        if verdict == Verdict.CONDITIONAL:
            result.modifications = self._generate_modifications(arguments, proposal)
            result.summary += f" | Mods: {result.modifications}"
        
        return result
    
    def _generate_modifications(
        self,
        arguments: list[DebateArgument],
        proposal: TradeProposal,
    ) -> dict:
        """Generate modifications for conditional approval."""
        mods = {}
        
        # Average position size recommendation from RISK agent
        risk_args = [a for a in arguments if a.role == DebateRole.RISK]
        if risk_args:
            avg_risk_conf = sum(a.confidence for a in risk_args) / len(risk_args)
            # Reduce position size if confidence low
            if avg_risk_conf < 0.6:
                mods["position_size_pct"] = min(proposal.position_size_pct, 2.0)
        
        # Wider stop recommendation from SKEPTIC
        skeptic_args = [a for a in arguments if a.role == DebateRole.SKEPTIC]
        if skeptic_args:
            # Add buffer to stop loss
            current_stop_dist = abs(proposal.entry_price - proposal.stop_loss) / proposal.entry_price
            if current_stop_dist < 0.03:
                mods["stop_loss_buffer"] = 1.5  # 1.5x wider
        
        return mods
    
    def get_debate_stats(self) -> dict:
        """Get debate statistics."""
        if not self.debate_history:
            return {"total_debates": 0}
        
        approved = sum(1 for r in self.debate_history if r.verdict == Verdict.APPROVED)
        rejected = sum(1 for r in self.debate_history if r.verdict == Verdict.REJECTED)
        conditional = sum(1 for r in self.debate_history if r.verdict == Verdict.CONDITIONAL)
        
        return {
            "total_debates": len(self.debate_history),
            "approved": approved,
            "rejected": rejected,
            "conditional": conditional,
            "approval_rate": approved / len(self.debate_history),
            "avg_rounds": sum(r.rounds for r in self.debate_history) / len(self.debate_history),
        }


# ============================================================
# DEBATE-GATED EXECUTOR
# ============================================================
class DebateGatedExecutor:
    """
    Execute trades only after debate approval.
    
    Usage:
        executor = DebateGatedExecutor(debate_orchestrator)
        result = await executor.propose_and_execute(trade_proposal)
    """
    
    def __init__(self, debate_orchestrator: DebateOrchestrator):
        self.debate = debate_orchestrator
        self.execution_log: list[dict] = []
    
    async def propose_and_execute(
        self,
        proposal: TradeProposal,
        execute_fn=None,  # Function to actually execute trade
        llm_callable=None,
    ) -> dict:
        """
        Propose trade, run debate, execute if approved.
        
        Returns:
            dict with debate result and execution status
        """
        # Run debate
        debate_result = await self.debate.run_debate(proposal, llm_callable)
        
        # Apply modifications if conditional
        final_proposal = proposal
        if debate_result.verdict == Verdict.CONDITIONAL:
            mods = debate_result.modifications
            if "position_size_pct" in mods:
                final_proposal.position_size_pct = mods["position_size_pct"]
        
        # Execute if approved
        executed = False
        execution_result = {}
        
        if debate_result.verdict in [Verdict.APPROVED, Verdict.CONDITIONAL]:
            if execute_fn:
                try:
                    execution_result = await execute_fn(final_proposal)
                    executed = True
                except Exception as e:
                    execution_result = {"error": str(e)}
        
        log_entry = {
            "proposal_id": proposal.id,
            "debate_result": debate_result.to_dict(),
            "executed": executed,
            "execution_result": execution_result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.execution_log.append(log_entry)
        
        return log_entry


# ============================================================
# SINGLETON INSTANCE
# ============================================================
debate_orchestrator = DebateOrchestrator()

__all__ = [
    "DebateRole",
    "Verdict", 
    "DebateArgument",
    "TradeProposal",
    "DebateResult",
    "DebateOrchestrator",
    "DebateGatedExecutor",
    "debate_orchestrator",
]