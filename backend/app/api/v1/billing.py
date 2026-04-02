"""
Stripe Payment Integration
============================
Handles subscription creation, webhooks, and billing.
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User

router = APIRouter()

# Stripe config (set in .env)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

# Price IDs (create these in Stripe dashboard)
PRICE_IDS = {
    "pro_monthly": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_monthly"),
    "enterprise_monthly": os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "price_enterprise_monthly"),
}


@router.get("/config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend."""
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "prices": {
            "pro": {"monthly": PRICE_IDS["pro_monthly"]},
            "enterprise": {"monthly": PRICE_IDS["enterprise_monthly"]},
        }
    }


@router.post("/create-checkout")
async def create_checkout(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session for subscription."""
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        body = await request.json()
        price_id = body.get("price_id")
        user_id = body.get("user_id")
        
        if not price_id or not user_id:
            raise HTTPException(status_code=400, detail="Missing price_id or user_id")
        
        # Get user
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create or get Stripe customer
        customer_id = getattr(user, 'stripe_customer_id', None)
        if not customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name or user.email,
                metadata={"user_id": str(user.id)}
            )
            customer_id = customer.id
            # Save customer ID (would need to add column to User model)
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{request.headers.get('origin', 'https://starktrade-ai.vercel.app')}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.headers.get('origin', 'https://starktrade-ai.vercel.app')}/pricing",
            metadata={"user_id": str(user.id)}
        )
        
        return {"url": checkout_session.url, "session_id": checkout_session.id}
        
    except ImportError:
        # Stripe not installed — return mock for demo
        return {
            "url": f"https://checkout.stripe.com/demo",
            "session_id": "demo_session",
            "note": "Set STRIPE_SECRET_KEY to enable real payments"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhooks for subscription events."""
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle events
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session["metadata"].get("user_id")
            
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                
                if user:
                    # Upgrade user to pro
                    user.role = "pro"
                    await db.commit()
        
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            customer_id = subscription["customer"]
            
            # Downgrade user to free
            result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
            user = result.scalar_one_or_none()
            
            if user:
                user.role = "free"
                await db.commit()
        
        return {"status": "success"}
        
    except ImportError:
        return {"status": "stripe_not_installed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscription/{user_id}")
async def get_subscription(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get user's subscription status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": str(user.id),
        "role": user.role,
        "is_active": user.is_active,
        "subscription_status": "active" if user.role in ["pro", "enterprise"] else "free",
    }
