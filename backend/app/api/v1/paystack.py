"""
Paystack Payment Integration
===============================
Nigerian/South African payment gateway.
Perfect for African markets.
"""

import os
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User

router = APIRouter()

# Paystack config
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")

# Pricing in ZAR (South African Rand)
PLANS = {
    "pro": {
        "name": "Pro Autopilot",
        "amount": 49900,  # R499.00 in kobo
        "interval": "monthly",
        "description": "All 7 agents, live trading, real-time data"
    },
    "enterprise": {
        "name": "Enterprise",
        "amount": 329900,  # R3,299.00 in kobo
        "interval": "monthly",
        "description": "Custom agents, API access, white-label"
    }
}

HEADERS = {
    "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
    "Content-Type": "application/json"
}


@router.get("/config")
async def paystack_config():
    """Get Paystack public key for frontend."""
    return {
        "public_key": PAYSTACK_PUBLIC_KEY,
        "currency": "ZAR",
        "plans": PLANS,
        "configured": bool(PAYSTACK_SECRET_KEY)
    }


@router.post("/initialize")
async def initialize_payment(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Initialize a Paystack payment.
    
    Body:
    {
        "email": "user@example.com",
        "plan": "pro",
        "user_id": "uuid"
    }
    """
    body = await request.json()
    email = body.get("email")
    plan = body.get("plan", "pro")
    user_id = body.get("user_id")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    plan_config = PLANS.get(plan)
    if not plan_config:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")
    
    if not PAYSTACK_SECRET_KEY:
        # Demo mode
        return {
            "status": True,
            "message": "Demo mode - set PAYSTACK_SECRET_KEY for real payments",
            "data": {
                "authorization_url": f"https://checkout.paystack.com/demo/{plan}",
                "access_code": "demo_access_code",
                "reference": f"starktrade_{datetime.utcnow().timestamp()}"
            }
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.paystack.co/transaction/initialize",
                headers=HEADERS,
                json={
                    "email": email,
                    "amount": plan_config["amount"],
                    "currency": "ZAR",
                    "plan": plan,
                    "metadata": {
                        "user_id": user_id,
                        "plan": plan,
                        "custom_fields": [
                            {
                                "display_name": "Plan",
                                "variable_name": "plan",
                                "value": plan_config["name"]
                            }
                        ]
                    },
                    "callback_url": "https://starktrade-ai.vercel.app/dashboard?payment=success",
                    "channels": ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"]
                }
            )
            
            data = response.json()
            
            if data.get("status"):
                return data
            else:
                raise HTTPException(status_code=400, detail=data.get("message", "Payment initialization failed"))
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify/{reference}")
async def verify_payment(reference: str, db: AsyncSession = Depends(get_db)):
    """Verify a Paystack payment."""
    if not PAYSTACK_SECRET_KEY:
        return {
            "status": True,
            "data": {
                "status": "success",
                "reference": reference,
                "amount": 49900,
                "currency": "ZAR"
            }
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers=HEADERS
            )
            
            data = response.json()
            
            if data.get("status") and data["data"]["status"] == "success":
                # Payment successful - upgrade user
                metadata = data["data"].get("metadata", {})
                user_id = metadata.get("user_id")
                
                if user_id:
                    result = await db.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    
                    if user:
                        plan = metadata.get("plan", "pro")
                        user.role = plan
                        await db.commit()
                
                return {"status": "success", "data": data["data"]}
            else:
                return {"status": "failed", "data": data.get("data")}
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle Paystack webhooks.
    Paystack sends events for successful payments, subscriptions, etc.
    """
    try:
        payload = await request.json()
        event = payload.get("event")
        
        if event == "charge.success":
            data = payload.get("data", {})
            metadata = data.get("metadata", {})
            user_id = metadata.get("user_id")
            
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                
                if user:
                    plan = metadata.get("plan", "pro")
                    user.role = plan
                    await db.commit()
        
        elif event == "subscription.disable":
            # User cancelled subscription
            data = payload.get("data", {})
            customer_email = data.get("customer", {}).get("email")
            
            if customer_email:
                result = await db.execute(select(User).where(User.email == customer_email))
                user = result.scalar_one_or_none()
                
                if user:
                    user.role = "free"
                    await db.commit()
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans")
async def get_plans():
    """Get available subscription plans."""
    return {
        "currency": "ZAR",
        "plans": {
            "free": {
                "name": "Paper Trader",
                "amount": 0,
                "features": [
                    "$100K paper balance",
                    "3 AI agents",
                    "Delayed data",
                    "1 prediction/day"
                ]
            },
            "pro": {
                "name": "Pro Autopilot",
                "amount": 499,  # R499/month
                "amount_display": "R499/month",
                "features": [
                    "Live trading",
                    "All 7 AI agents",
                    "Real-time data",
                    "Unlimited predictions",
                    "Priority support",
                    "WhatsApp alerts"
                ]
            },
            "enterprise": {
                "name": "Enterprise",
                "amount": 3299,  # R3,299/month
                "amount_display": "R3,299/month",
                "features": [
                    "Everything in Pro",
                    "Custom AI agents",
                    "API access",
                    "White-label",
                    "Dedicated support"
                ]
            }
        }
    }
