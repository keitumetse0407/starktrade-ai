"""Admin API routes — requires admin role."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.db.session import get_db
from app.db.models import User, SiteConfig, Trade, Portfolio, Agent
from app.core.auth import get_current_user, hash_password
from app.schemas.schemas import UserResponse

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============================================================
# DASHBOARD STATS
# ============================================================
@router.get("/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar()

    trade_count = await db.execute(
        select(func.count(Trade.id)).where(Trade.status == "executed")
    )
    total_trades = trade_count.scalar()

    portfolio_value = await db.execute(
        select(func.sum(Portfolio.total_value)).where(Portfolio.is_paper == False)
    )
    total_aum = float(portfolio_value.scalar() or 0)

    return {
        "total_users": total_users,
        "total_trades": total_trades,
        "total_aum": total_aum,
        "server_time": datetime.utcnow().isoformat(),
    }


# ============================================================
# USER MANAGEMENT
# ============================================================
@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    role: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "auto_trading_enabled": u.auto_trading_enabled,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        }
        for u in users
    ]


@router.post("/users/create-admin")
async def create_admin_user(
    email: str = Query(...),
    password: str = Query(..., min_length=8),
    full_name: str = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    return {
        "status": "created",
        "user_id": str(user.id),
        "email": email,
        "role": "admin",
    }


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: str = Query(..., pattern="^(admin|free|pro|enterprise)$"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if str(admin.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = new_role
    await db.flush()

    return {"status": "updated", "user_id": user_id, "new_role": new_role}


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.flush()

    return {"status": "updated", "user_id": user_id, "is_active": user.is_active}


# ============================================================
# SITE CONFIG (AdSense, feature flags)
# ============================================================
@router.get("/config")
async def get_site_config(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteConfig))
    configs = result.scalars().all()

    return {c.key: {"value": c.value, "description": c.description} for c in configs}


@router.put("/config/{key}")
async def update_site_config(
    key: str,
    value: str = Query(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteConfig).where(SiteConfig.key == key))
    config = result.scalar_one_or_none()

    if not config:
        config = SiteConfig(key=key, value=value, updated_by=admin.id)
        db.add(config)
    else:
        config.value = value
        config.updated_by = admin.id

    await db.flush()

    return {"status": "updated", "key": key, "value": value}


# ============================================================
# GET ADSENSE CONFIG (public endpoint for frontend)
# ============================================================
@router.get("/public/config")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    keys = ["adsense_client_id", "adsense_slot_landing", "adsense_slot_dashboard", "adsense_slot_predictions", "site_name"]
    result = await db.execute(select(SiteConfig).where(SiteConfig.key.in_(keys)))
    configs = result.scalars().all()

    return {c.key: c.value for c in configs}
