import asyncio
import hashlib
import hmac
import os
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/password-reset", tags=["password-reset"])
logger = logging.getLogger("routes_password_reset")

OTP_EXPIRY_SECONDS = int(os.getenv("PASSWORD_RESET_OTP_EXPIRY_SECONDS", "600"))
MAX_OTP_ATTEMPTS = int(os.getenv("PASSWORD_RESET_MAX_OTP_ATTEMPTS", "5"))


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetVerifyRequest(BaseModel):
    requestId: str
    otp: str


class PasswordResetCompleteRequest(BaseModel):
    requestId: str
    newPassword: str


def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def _create_request_id() -> str:
    return secrets.token_urlsafe(24)


def _create_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def _create_salt() -> str:
    return secrets.token_hex(16)


def _hash_otp(otp: str, salt: str) -> str:
    payload = f"{salt}:{otp}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _send_reset_email(recipient_email: str, otp: str) -> None:
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_api_key:
        import urllib.request
        import json
        
        resend_from = os.getenv("RESEND_FROM_EMAIL", "Mian & Sons Hardware <noreply@miansonshardwarestore.me>").strip()
        url = "https://api.resend.com/emails"
        
        email_text = """Use this OTP to reset your password:
        
{otp}

This code expires in {minutes} minutes.

If you did not request this, you can ignore this email.
""".format(otp=otp, minutes=OTP_EXPIRY_SECONDS // 60 or 10)

        html_body = """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a; margin-bottom: 20px; text-align: center;">Mian & Sons Hardware</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">Use this OTP to reset your password:</p>
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ea580c; font-family: monospace;">{otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This code expires in {minutes} minutes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">If you did not request this, you can safely ignore this email.</p>
        </div>
        """.format(otp=otp, minutes=OTP_EXPIRY_SECONDS // 60 or 10)

        payload = {
            "from": resend_from,
            "to": recipient_email,
            "subject": "Your password reset OTP",
            "text": email_text,
            "html": html_body
        }
        
        headers = {
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                res_body = response.read().decode("utf-8")
                logger.info(f"Resend email sent successfully: {res_body}")
                return
        except Exception as e:
            logger.error(f"Error sending email via Resend: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email via Resend: {str(e)}"
            )

    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or recipient_email).strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"}

    if not smtp_host:
        raise HTTPException(
            status_code=503,
            detail="Email delivery is not configured on the server.",
        )

    message = EmailMessage()
    message["Subject"] = "Your password reset OTP"
    message["From"] = smtp_from
    message["To"] = recipient_email
    message.set_content(
        """Use this OTP to reset your password:

{otp}

This code expires in {minutes} minutes.

If you did not request this, you can ignore this email.
""".format(otp=otp, minutes=OTP_EXPIRY_SECONDS // 60 or 10)
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        if smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.send_message(message)


@router.post("/request")
async def request_password_reset(payload: PasswordResetRequest, request: Request):
    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    # Check database or fallback file to verify email exists
    db = request.app.state.db
    user_exists = False
    try:
        user = await db.customer_auth_accounts.find_one({"email": email})
        if user:
            user_exists = True
    except Exception as e:
        logger.error(f"Error querying customer account for password reset: {str(e)}")

    if not user_exists:
        try:
            from routes_customers import _read_fallback_customer_auth_accounts
            accounts = await _read_fallback_customer_auth_accounts()
            if any(_normalize_email(acc.get("email")) == email for acc in accounts):
                user_exists = True
        except Exception as e:
            logger.error(f"Error reading fallback customer accounts for password reset: {str(e)}")

    if not user_exists:
        raise HTTPException(status_code=404, detail="No account found with that email address.")

    otp = _create_otp()
    salt = _create_salt()
    request_id = _create_request_id()
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=OTP_EXPIRY_SECONDS)

    otp_record = {
        "requestId": request_id,
        "email": email,
        "otpHash": _hash_otp(otp, salt),
        "otpSalt": salt,
        "createdAt": now,
        "expiresAt": expires_at,
        "attempts": 0,
        "verified": False,
    }

    try:
        # Save to database
        await db.otp_resets.insert_one(otp_record)
        await asyncio.to_thread(_send_reset_email, email, otp)
    except Exception:
        # Cleanup if sending email fails
        await db.otp_resets.delete_one({"requestId": request_id})
        raise

    return {
        "ok": True,
        "requestId": request_id,
        "expiresAt": int(expires_at.timestamp()),
    }


@router.post("/verify")
async def verify_password_reset_otp(payload: PasswordResetVerifyRequest, request: Request):
    db = request.app.state.db
    otp_record = await db.otp_resets.find_one({"requestId": payload.requestId})
    if not otp_record:
        return {"ok": False, "reason": "not_found"}

    now = datetime.utcnow()
    expires_at = otp_record.get("expiresAt")
    if expires_at and now > expires_at:
        await db.otp_resets.delete_one({"requestId": payload.requestId})
        return {"ok": False, "reason": "expired"}

    if otp_record.get("attempts", 0) >= MAX_OTP_ATTEMPTS:
        await db.otp_resets.delete_one({"requestId": payload.requestId})
        return {"ok": False, "reason": "locked"}

    incoming_hash = _hash_otp(payload.otp, otp_record["otpSalt"])
    if not hmac.compare_digest(incoming_hash, otp_record["otpHash"]):
        await db.otp_resets.update_one(
            {"requestId": payload.requestId},
            {"$inc": {"attempts": 1}}
        )
        return {"ok": False, "reason": "invalid"}

    await db.otp_resets.update_one(
        {"requestId": payload.requestId},
        {"$set": {"verified": True}}
    )
    return {"ok": True}


@router.post("/complete")
async def complete_password_reset(payload: PasswordResetCompleteRequest, request: Request):
    db = request.app.state.db
    req_id = payload.requestId
    new_password = payload.newPassword

    if not req_id:
        raise HTTPException(status_code=400, detail="Request ID is required.")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required.")

    otp_record = await db.otp_resets.find_one({"requestId": req_id})
    if not otp_record or not otp_record.get("verified"):
        raise HTTPException(status_code=400, detail="Password reset request is not verified or expired.")

    email = otp_record["email"]
    password_hash = _hash_password(new_password)

    # Update MongoDB
    updated = False
    try:
        result = await db.customer_auth_accounts.update_one(
            {"email": email},
            {"$set": {"passwordHash": password_hash}}
        )
        if result.matched_count > 0:
            updated = True
    except Exception as e:
        logger.error(f"Error updating customer password hash in DB: {str(e)}")

    # If not updated (e.g. database down), update fallback file
    if not updated:
        try:
            from routes_customers import _read_fallback_customer_auth_accounts, _write_fallback_customer_auth_accounts
            accounts = await _read_fallback_customer_auth_accounts()
            found = False
            for acc in accounts:
                if _normalize_email(acc.get("email")) == email:
                    acc["passwordHash"] = password_hash
                    found = True
                    break
            if found:
                await _write_fallback_customer_auth_accounts(accounts)
                updated = True
        except Exception as e:
            logger.error(f"Error updating customer password hash in fallback file: {str(e)}")

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update password. User not found.")

    # Remove the request so it cannot be reused
    await db.otp_resets.delete_one({"requestId": req_id})

    return {"ok": True}
