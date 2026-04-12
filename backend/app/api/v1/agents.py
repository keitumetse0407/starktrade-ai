"""Agents API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User, Agent, AgentDecision
from app.core.auth import get_current_user
from app.schemas.schemas import AgentResponse, AgentDecisionResponse

router = APIRouter()


@router.get("/", response_model=list[AgentResponse])
async def get_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).order_by(Agent.name))
    return result.scalars().all()


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/{agent_id}/decisions", response_model=list[AgentDecisionResponse])
async def get_agent_decisions(
    agent_id: str,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AgentDecision)
        .where(AgentDecision.agent_id == agent_id)
        .order_by(AgentDecision.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/{agent_id}/weight")
async def update_agent_weight(
    agent_id: str,
    weight: float = Query(ge=0.1, le=5.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "enterprise":
        raise HTTPException(status_code=403, detail="Enterprise feature only")

    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.weight = weight
    await db.flush()
    return {"status": "updated", "agent_id": agent_id, "new_weight": weight}


@router.post("/analyze")
async def analyze(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger HRM multi-agent analysis."""
    try:
        from app.agents.orchestrator import run_pipeline
        result = await run_pipeline(payload.get("symbol", "XAUUSD"))
        return {"status": "complete", "result": result}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
