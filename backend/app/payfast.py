"""
PayFast Payment Gateway Integration for StarkTrade AI
Handles payment initiation, signature generation, and ITN verification.
"""

import hashlib
import urllib.parse
import urllib.request
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# PayFast URLs
PAYFAST_SANDBOX = "https://sandbox.payfast.co.za/eng/process"
PAYFAST_LIVE = "https://www.payfast.co.za/eng/process"
PAYFAST_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate"


@dataclass
class PayFastConfig:
    merchant_id: str
    merchant_key: str
    passphrase: str = ""
    sandbox: bool = False

    @property
    def process_url(self) -> str:
        return PAYFAST_SANDBOX if self.sandbox else PAYFAST_LIVE


def generate_signature(data: dict, passphrase: str = "") -> str:
    """
    Generate PayFast signature from payment data.
    Signature = MD5(urlencoded string of params + passphrase)
    """
    # Create parameter string
    param_string = ""
    for key in sorted(data.keys()):
        value = str(data[key]).strip()
        if value:
            param_string += f"{key}={urllib.parse.quote_plus(value)}&"

    # Remove trailing &
    param_string = param_string.rstrip("&")

    # Add passphrase if set
    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase)}"

    # Generate MD5 hash
    signature = hashlib.md5(param_string.encode()).hexdigest()
    return signature


def create_payment_data(
    config: PayFastConfig,
    amount: float,
    item_name: str,
    item_description: str = "",
    custom_str1: str = "",
    custom_str2: str = "",
    custom_str3: str = "",
    custom_str4: str = "",
    custom_str5: str = "",
    custom_int1: int = 0,
    custom_int2: int = 0,
    email_address: str = "",
    name_first: str = "",
    name_last: str = "",
    m_payment_id: str = "",
    return_url: str = "",
    cancel_url: str = "",
    notify_url: str = "",
) -> dict:
    """
    Create PayFast payment data dictionary with signature.
    """
    data = {
        "merchant_id": config.merchant_id,
        "merchant_key": config.merchant_key,
        "return_url": return_url or "https://starktrade-ai.vercel.app/payment/success",
        "cancel_url": cancel_url or "https://starktrade-ai.vercel.app/payment/cancel",
        "notify_url": notify_url or "https://starktrade-ai.vercel.app/api/payfast/itn",
        "name_first": name_first,
        "name_last": name_last,
        "email_address": email_address,
        "m_payment_id": m_payment_id,
        "amount": f"{amount:.2f}",
        "item_name": item_name,
        "item_description": item_description,
        "custom_str1": custom_str1,
        "custom_str2": custom_str2,
        "custom_str3": custom_str3,
        "custom_str4": custom_str4,
        "custom_str5": custom_str5,
        "custom_int1": str(custom_int1),
        "custom_int2": str(custom_int2),
    }

    # Remove empty values
    data = {k: v for k, v in data.items() if v}

    # Generate signature
    data["signature"] = generate_signature(data, config.passphrase)

    return data


def generate_payment_url(config: PayFastConfig, payment_data: dict) -> str:
    """
    Generate full PayFast payment URL with encoded parameters.
    """
    param_string = urllib.parse.urlencode(payment_data)
    return f"{config.process_url}?{param_string}"


def generate_payment_form_html(config: PayFastConfig, payment_data: dict, button_text: str = "Pay Now") -> str:
    """
    Generate HTML form for PayFast payment (auto-submit).
    """
    form_inputs = ""
    for key, value in payment_data.items():
        form_inputs += f'    <input type="hidden" name="{key}" value="{value}" />\n'

    html = f"""<form id="payfast-form" action="{config.process_url}" method="POST">
{form_inputs}    <button type="submit" class="payfast-btn">{button_text}</button>
</form>
<script>
  // Auto-submit for seamless redirect
  // document.getElementById('payfast-form').submit();
</script>"""
    return html


def verify_itn(itn_data: dict, passphrase: str = "") -> tuple[bool, str]:
    """
    Verify PayFast ITN (Instant Transaction Notification).
    Returns (is_valid, status_message).
    """
    # Step 1: Verify signature
    received_signature = itn_data.get("signature", "")
    check_data = {k: v for k, v in itn_data.items() if k != "signature"}
    calculated_signature = generate_signature(check_data, passphrase)

    if received_signature != calculated_signature:
        logger.warning(f"ITN signature mismatch: received={received_signature}, calculated={calculated_signature}")
        return False, "Invalid signature"

    # Step 2: Verify with PayFast server
    param_string = urllib.parse.urlencode(itn_data)
    try:
        req = urllib.request.Request(
            PAYFAST_VALIDATE_URL,
            data=param_string.encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            validation_response = response.read().decode().strip()
            if validation_response != "VALID":
                logger.warning(f"PayFast validation failed: {validation_response}")
                return False, f"Validation failed: {validation_response}"
    except Exception as e:
        logger.error(f"PayFast validation request failed: {e}")
        return False, f"Validation request failed: {e}"

    return True, "Valid ITN"


def parse_itn(form_data: dict) -> dict:
    """
    Parse and normalize ITN data from PayFast POST request.
    """
    return {
        "m_payment_id": form_data.get("m_payment_id", ""),
        "pf_payment_id": form_data.get("pf_payment_id", ""),
        "payment_status": form_data.get("payment_status", ""),
        "item_name": form_data.get("item_name", ""),
        "item_description": form_data.get("item_description", ""),
        "amount_gross": float(form_data.get("amount_gross", 0)),
        "amount_fee": float(form_data.get("amount_fee", 0)),
        "amount_net": float(form_data.get("amount_net", 0)),
        "custom_str1": form_data.get("custom_str1", ""),
        "custom_str2": form_data.get("custom_str2", ""),
        "custom_str3": form_data.get("custom_str3", ""),
        "custom_str4": form_data.get("custom_str4", ""),
        "custom_str5": form_data.get("custom_str5", ""),
        "custom_int1": int(form_data.get("custom_int1", 0)),
        "custom_int2": int(form_data.get("custom_int2", 0)),
        "name_first": form_data.get("name_first", ""),
        "name_last": form_data.get("name_last", ""),
        "email_address": form_data.get("email_address", ""),
        "merchant_id": form_data.get("merchant_id", ""),
        "signature": form_data.get("signature", ""),
    }


# ─── PRICING CONFIG ─────────────────────────────────────────────────────────

PRICING = {
    "pro": {
        "name": "StarkTrade AI Pro",
        "amount": 499.00,
        "description": "Pro plan - Monthly subscription",
        "features": ["Unlimited signals", "Advanced AI analysis", "Priority support", "WhatsApp alerts"],
    },
    "enterprise": {
        "name": "StarkTrade AI Enterprise",
        "amount": 3299.00,
        "description": "Enterprise plan - Monthly subscription",
        "features": ["Everything in Pro", "Custom strategies", "API access", "Dedicated support", "White-label options"],
    },
}


def get_plan(plan_id: str) -> Optional[dict]:
    """Get pricing plan by ID."""
    return PRICING.get(plan_id.lower())
