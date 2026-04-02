"""
PayFast API Routes for StarkTrade AI
Add these to your FastAPI backend.
"""

from fastapi import APIRouter, Request, HTTPException, Form, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional
import logging
import json
import os
from datetime import datetime

from payfast import (
    PayFastConfig,
    create_payment_data,
    generate_payment_url,
    generate_payment_form_html,
    verify_itn,
    parse_itn,
    get_plan,
    PRICING,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payfast", tags=["payments"])

# ─── CONFIG (load from env vars) ────────────────────────────────────────────

def get_payfast_config() -> PayFastConfig:
    return PayFastConfig(
        merchant_id=os.getenv("PAYFAST_MERCHANT_ID", "34411889"),
        merchant_key=os.getenv("PAYFAST_MERCHANT_KEY", "3zkl5gmlic8d6"),
        passphrase=os.getenv("PAYFAST_PASSPHRASE", ""),
        sandbox=os.getenv("PAYFAST_SANDBOX", "false").lower() == "true",
    )


# ─── REQUEST MODELS ─────────────────────────────────────────────────────────

class CreatePaymentRequest(BaseModel):
    plan_id: str  # "pro" or "enterprise"
    email: str
    first_name: str = ""
    last_name: str = ""
    user_id: str = ""


class PaymentResponse(BaseModel):
    success: bool
    payment_url: Optional[str] = None
    form_html: Optional[str] = None
    payment_id: Optional[str] = None
    amount: Optional[float] = None
    plan_name: Optional[str] = None
    error: Optional[str] = None


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans():
    """List available subscription plans."""
    return {
        "plans": [
            {
                "id": plan_id,
                "name": plan["name"],
                "amount": plan["amount"],
                "currency": "ZAR",
                "description": plan["description"],
                "features": plan["features"],
            }
            for plan_id, plan in PRICING.items()
        ]
    }


@router.post("/create", response_model=PaymentResponse)
async def create_payment(request: CreatePaymentRequest):
    """
    Create a new PayFast payment.
    Returns payment URL and auto-submit form HTML.
    """
    try:
        # Get plan details
        plan = get_plan(request.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan_id}")

        config = get_payfast_config()

        # Generate unique payment ID
        payment_id = f"stark_{request.user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Create payment data
        payment_data = create_payment_data(
            config=config,
            amount=plan["amount"],
            item_name=plan["name"],
            item_description=plan["description"],
            email_address=request.email,
            name_first=request.first_name,
            name_last=request.last_name,
            m_payment_id=payment_id,
            custom_str1=request.user_id,  # Store user_id for ITN
            custom_str2=request.plan_id,  # Store plan_id for ITN
        )

        # Generate payment URL and form
        payment_url = generate_payment_url(config, payment_data)
        form_html = generate_payment_form_html(config, payment_data, f"Pay R{plan['amount']:.2f}")

        logger.info(f"Payment created: {payment_id} for {request.email} - {request.plan_id}")

        return PaymentResponse(
            success=True,
            payment_url=payment_url,
            form_html=form_html,
            payment_id=payment_id,
            amount=plan["amount"],
            plan_name=plan["name"],
        )

    except Exception as e:
        logger.error(f"Payment creation failed: {e}")
        return PaymentResponse(success=False, error=str(e))


@router.post("/itn")
async def handle_itn(request: Request):
    """
    PayFast ITN (Instant Transaction Notification) handler.
    PayFast POSTs here after payment is processed.
    """
    try:
        # Parse form data
        form_data = await request.form()
        itn_data = {k: v for k, v in form_data.items()}
        logger.info(f"ITN received: {json.dumps(itn_data, default=str)}")

        # Parse and normalize
        parsed = parse_itn(itn_data)

        # Verify ITN
        config = get_payfast_config()
        is_valid, message = verify_itn(itn_data, config.passphrase)

        if not is_valid:
            logger.warning(f"ITN verification failed: {message}")
            return JSONResponse(content={"status": "error", "message": message}, status_code=400)

        # Process based on payment status
        payment_status = parsed["payment_status"]
        user_id = parsed["custom_str1"]
        plan_id = parsed["custom_str2"]

        if payment_status == "COMPLETE":
            logger.info(f"Payment COMPLETE: user={user_id}, plan={plan_id}, amount={parsed['amount_gross']}")
            # TODO: Update user subscription in database
            # await update_user_subscription(user_id, plan_id, "active")

        elif payment_status == "CANCELLED":
            logger.info(f"Payment CANCELLED: user={user_id}, plan={plan_id}")
            # TODO: Handle cancellation

        else:
            logger.info(f"Payment status: {payment_status} for user={user_id}")

        return JSONResponse(content={"status": "ok"})

    except Exception as e:
        logger.error(f"ITN processing failed: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)


@router.get("/success")
async def payment_success():
    """Payment success redirect page."""
    return HTMLResponse(content="""
    <html>
    <head><title>Payment Successful</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>Payment Successful!</h1>
        <p>Thank you for subscribing to StarkTrade AI.</p>
        <p>Your subscription is now active.</p>
        <a href="https://starktrade-ai.vercel.app/dashboard">Go to Dashboard</a>
    </body>
    </html>
    """)


@router.get("/cancel")
async def payment_cancel():
    """Payment cancelled redirect page."""
    return HTMLResponse(content="""
    <html>
    <head><title>Payment Cancelled</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>Payment Cancelled</h1>
        <p>Your payment was not processed.</p>
        <a href="https://starktrade-ai.vercel.app/pricing">Try Again</a>
    </body>
    </html>
    """)
