"""Database seed — creates admin user if no users exist yet."""
import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import hash_password
from app.db.models import User, SiteConfig

logger = logging.getLogger(__name__)

# ─── CHANGE THESE if you want different defaults ───
ADMIN_EMAIL = "keitumetse0407@gmail.com"
ADMIN_PASSWORD = "StarkTrade2026!_Admin"  # Change after first login
ADMIN_NAME = "Keitumetse"
# ─────────────────────────────────────────────────────


async def seed_admin(db: AsyncSession):
    """Create admin user only if the users table is empty."""
    count_result = await db.execute(select(func.count(User.id)))
    user_count = count_result.scalar()

    if user_count > 0:
        logger.info(f"Database already has {user_count} user(s), skipping seed")
        return

    hashed = hash_password(ADMIN_PASSWORD)
    admin_user = User(
        email=ADMIN_EMAIL,
        hashed_password=hashed,
        full_name=ADMIN_NAME,
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(admin_user)

    # Default site config
    defaults = [
        SiteConfig(key="site_name", value="StarkTrade AI", description="Public site name"),
        SiteConfig(key="signal_service_active", value="true", description="Whether signal service is accepting payments"),
        SiteConfig(key="founding_member_price", value="299", description="Monthly price in ZAR for founding members"),
    ]
    for cfg in defaults:
        db.add(cfg)

    await db.commit()
    logger.info(f"✅ Admin user created: {ADMIN_EMAIL} | Password: {ADMIN_PASSWORD}")
    logger.info("⚠️  Change the password after first login")


async def seed_all(db: AsyncSession):
    """Run all seed scripts."""
    await seed_admin(db)
