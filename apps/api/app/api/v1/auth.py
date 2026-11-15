import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    hash_meter_for_lookup,
    encrypt_meter_number,
    mask_meter_number,
    create_access_token,
    create_refresh_token,
    generate_csrf_token,
    decode_token
)
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.invite import SupervisorInvite
from app.models.consent import ConsentRecord
from app.models.audit import AuditLog
from app.schemas.auth import (
    CitizenRegisterRequest,
    SupervisorAcceptInviteRequest,
    LoginRequest,
    AuthResponse
)
from app.schemas.security import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Admin2FAChallengeRequest
)
from app.models.password_reset import PasswordResetToken
from app.models.admin_2fa import Admin2FA
from app.services.email_service import EmailService
from app.services.security_service import SecurityService
from app.services.notification_service import NotificationService
from app.adapters.email_adapter import get_email_adapter

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _generate_greenpay_id(db: Session) -> str:
    """Generates unique GP-XXXXXX permanent citizen ID."""
    while True:
        num = secrets.randbelow(900000) + 100000
        candidate = f"GP-{num}"
        if not db.query(User).filter(User.greenpay_id == candidate).first():
            return candidate

def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    role: str
):
    """Sets separate scoped cookies for citizen vs admin apps."""
    is_admin = role in ("SUPERVISOR", "SUPER_ADMIN")
    
    access_cookie = settings.ADMIN_ACCESS_COOKIE if is_admin else settings.CITIZEN_ACCESS_COOKIE
    refresh_cookie = settings.ADMIN_REFRESH_COOKIE if is_admin else settings.CITIZEN_REFRESH_COOKIE
    csrf_cookie = settings.ADMIN_CSRF_COOKIE if is_admin else settings.CITIZEN_CSRF_COOKIE
    cookie_path = "/"
    
    # Access token cookie
    response.set_cookie(
        key=access_cookie,
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=cookie_path
    )
    # Rotating refresh token cookie
    response.set_cookie(
        key=refresh_cookie,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path=cookie_path
    )
    # CSRF Double-submit cookie (readable by frontend JS to echo in X-CSRF-Token header)
    response.set_cookie(
        key=csrf_cookie,
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path=cookie_path
    )

def _clear_auth_cookies(response: Response, role: str):
    is_admin = role in ("SUPERVISOR", "SUPER_ADMIN")
    access_cookie = settings.ADMIN_ACCESS_COOKIE if is_admin else settings.CITIZEN_ACCESS_COOKIE
    refresh_cookie = settings.ADMIN_REFRESH_COOKIE if is_admin else settings.CITIZEN_REFRESH_COOKIE
    csrf_cookie = settings.ADMIN_CSRF_COOKIE if is_admin else settings.CITIZEN_CSRF_COOKIE
    
    response.delete_cookie(key=access_cookie, path="/")
    response.delete_cookie(key=refresh_cookie, path="/")
    response.delete_cookie(key=csrf_cookie, path="/")

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_citizen(
    payload: CitizenRegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Age compliance check (DPDP Section 9)
    if not payload.is_adult_declared:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="In accordance with DPDP Act 2023 Section 9, individuals under 18 require verifiable guardian consent. Self-registration is unavailable for minors."
        )
        
    # 2. Required terms consent
    if not payload.terms_privacy_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must consent to the Terms of Service and Privacy Policy to create a GreenPay account."
        )
        
    # 3. Lookup ward (Names only: Koramangala, Indiranagar, Jayanagar, Whitefield)
    ward = db.query(Ward).filter(Ward.name.ilike(payload.ward_name.strip())).first()
    if not ward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ward '{payload.ward_name}' is not recognized. Permitted wards: Koramangala, Indiranagar, Jayanagar, Whitefield."
        )
        
    # 4. Check duplicate meter number
    meter_hash = hash_meter_for_lookup(payload.meter_number)
    existing_user = db.query(User).filter(User.meter_number_hash == meter_hash).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account is already registered for this electricity meter number. Please log in or contact your ward supervisor."
        )
        
    # 5. Create Citizen Account (Status: PENDING per Amendment #3)
    greenpay_id = _generate_greenpay_id(db)
    encrypted_meter = encrypt_meter_number(payload.meter_number)
    hashed_pwd = hash_password(payload.password)
    
    user = User(
        meter_number_hash=meter_hash,
        meter_number_encrypted=encrypted_meter,
        greenpay_id=greenpay_id,
        password_hash=hashed_pwd,
        role="CITIZEN",
        status="PENDING", # Pending supervisor doorstep activation
        is_adult_declared=True
    )
    db.add(user)
    db.flush()
    
    # 6. Create Profile
    unsub_token = EmailService.generate_unsubscribe_token() if payload.email else None
    profile = UserProfile(
        user_id=user.id,
        name=payload.name.strip(),
        ward_id=ward.id,
        email=str(payload.email) if payload.email else None,
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        green_score=50.0,
        email_marketing_opt_in=payload.marketing_consent,
        unsubscribe_token=unsub_token
    )
    db.add(profile)
    
    # 7. Record Unbundled Consents
    client_ip = request.client.host if request.client else None
    db.add(ConsentRecord(
        user_id=user.id,
        consent_type="TERMS_AND_PRIVACY",
        consent_version="2026.1",
        granted=True,
        ip_address=client_ip
    ))
    if payload.marketing_consent:
        db.add(ConsentRecord(
            user_id=user.id,
            consent_type="MARKETING_NOTIFICATIONS",
            consent_version="2026.1",
            granted=True,
            ip_address=client_ip
        ))
        
    # 8. Record Audit Log
    db.add(AuditLog(
        actor_id=user.id,
        actor_role="CITIZEN",
        action="REGISTER",
        affected_entity_type="User",
        affected_entity_id=user.id,
        diff=f'{{"greenpay_id": "{greenpay_id}", "status": "PENDING", "ward": "{ward.name}"}}',
        ip_address=client_ip
    ))
    db.commit()
    db.refresh(user)
    
    # 9. Issue JWT and set cookies
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    csrf_token = generate_csrf_token()
    
    _set_auth_cookies(response, access_token, refresh_token, csrf_token, user.role)
    
    return AuthResponse(
        access_token=access_token,
        role=user.role,
        greenpay_id=user.greenpay_id,
        user_status=user.status,
        csrf_token=csrf_token,
        masked_meter=mask_meter_number(payload.meter_number),
        name=profile.name,
        ward_name=ward.name
    )

@router.post("/accept-invite", response_model=AuthResponse)
def accept_supervisor_invite(
    payload: SupervisorAcceptInviteRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    invite = (
        db.query(SupervisorInvite)
        .filter(SupervisorInvite.token_hash == token_hash)
        .first()
    )
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or unrecognized supervisor invitation token."
        )
    if invite.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This supervisor invitation token has already been redeemed."
        )
    now_utc = datetime.now(timezone.utc)
    expires = invite.expires_at if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
    if expires < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This supervisor invitation token has expired. Please request a new invite from Super-admin."
        )
        
    # Create Supervisor account
    hashed_pwd = hash_password(payload.password)
    user = User(
        password_hash=hashed_pwd,
        role="SUPERVISOR",
        status="ACTIVE",
        is_adult_declared=True
    )
    db.add(user)
    db.flush()
    
    profile = UserProfile(
        user_id=user.id,
        name=invite.name,
        ward_id=invite.assigned_ward_id,
        email=invite.email,
        green_score=100.0
    )
    db.add(profile)
    
    # Mark invite as redeemed
    invite.used = True
    invite.used_at = datetime.now(timezone.utc)
    
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        actor_id=user.id,
        actor_role="SUPERVISOR",
        action="SUPERVISOR_ACCEPT_INVITE",
        affected_entity_type="SupervisorInvite",
        affected_entity_id=invite.id,
        diff=f'{{"supervisor_id": "{user.id}", "email": "{invite.email}"}}',
        ip_address=client_ip
    ))
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    csrf_token = generate_csrf_token()
    
    _set_auth_cookies(response, access_token, refresh_token, csrf_token, user.role)
    
    return AuthResponse(
        access_token=access_token,
        role=user.role,
        greenpay_id=None,
        user_status=user.status,
        csrf_token=csrf_token,
        masked_meter=None,
        name=profile.name,
        ward_name=invite.assigned_ward.name if invite.assigned_ward else None
    )

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    identifier = payload.identifier.strip()
    user = None
    
    # 1. Try matching by meter number hash
    meter_hash = hash_meter_for_lookup(identifier)
    user = db.query(User).filter(User.meter_number_hash == meter_hash).first()
    
    # 2. Try matching by email
    if not user:
        profile = db.query(UserProfile).filter(UserProfile.email.ilike(identifier)).first()
        if profile:
            user = profile.user
            
    # 3. Try matching by GreenPay ID
    if not user and identifier.upper().startswith("GP-"):
        user = db.query(User).filter(User.greenpay_id == identifier.upper()).first()
        
    generic_msg = "If an account matches that identifier, password reset instructions have been dispatched."
    
    if not user or user.status in ("DELETED", "SUSPENDED"):
        return {"message": generic_msg}
        
    client_ip = request.client.host if request.client else None
    reset_token = SecurityService.create_password_reset_token(db, user.id, ip=client_ip)
    
    portal = payload.portal.lower() if payload.portal else "citizen"
    base_url = "http://localhost:5174" if (portal == "admin" or user.role in ("SUPERVISOR", "SUPER_ADMIN")) else "http://localhost:5173"
    reset_url = f"{base_url}/reset-password?token={reset_token}"
    
    user_email = user.profile.email if user.profile else None
    user_phone = user.profile.phone_number if user.profile else None
    
    if user_email:
        email_adapter = get_email_adapter()
        email_adapter.send_email(
            to_email=user_email,
            subject="Reset Your GreenPay Password",
            html_content=f"<p>Hello,</p><p>We received a request to reset your GreenPay account password.</p><p><a href='{reset_url}'>Click here to reset your password</a></p><p>This link is valid for 30 minutes. If you did not request this, you may safely ignore this message.</p>",
            text_content=f"Reset your GreenPay password: {reset_url} (valid for 30 minutes)."
        )
    elif user_phone:
        from app.adapters.sms_adapter import get_sms_adapter
        sms_adapter = get_sms_adapter()
        sms_adapter.send_sms(
            to_phone=user_phone,
            message=f"GreenPay Password Reset: {reset_url} . Valid for 30 minutes."
        )
        
    return {"message": generic_msg}

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = SecurityService.validate_and_consume_reset_token(db, payload.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid, expired, or has already been used. Please request a new one."
        )
        
    # Update password
    user.password_hash = hash_password(payload.new_password)
    
    # Invalidate all active sessions for this user
    SecurityService.revoke_all_user_sessions(db, user.id)
    
    # Audit log
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        actor_id=user.id,
        actor_role=user.role,
        action="PASSWORD_RESET_COMPLETED",
        affected_entity_type="User",
        affected_entity_id=user.id,
        diff='{"status": "password_updated", "sessions_revoked": true}',
        ip_address=client_ip
    ))
    db.commit()
    
    # Dispatch security notice
    NotificationService.dispatch_notification(
        db,
        user=user,
        category="SECURITY_NOTICE",
        title_key="security.password_changed_title",
        message_key="security.password_changed_body",
        rendered_title="Security Notice: GreenPay Password Changed",
        rendered_body="Your GreenPay account password was successfully changed. All existing sessions have been signed out."
    )
    
    return {"message": "Your password has been successfully reset. All active sessions have been terminated. You can now log in with your new password."}

@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    identifier = payload.meter_number_or_email.strip()
    client_ip = request.client.host if request.client else "unknown"
    
    # Progressive Lockout Check
    lockout_remaining = SecurityService.check_lockout(db, identifier)
    if lockout_remaining:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to excessive failed attempts. Please try again in {lockout_remaining} minute(s)."
        )
        
    user = None
    
    # 1. Try matching by meter number hash (for citizens)
    meter_hash = hash_meter_for_lookup(identifier)
    user = db.query(User).filter(User.meter_number_hash == meter_hash).first()
    
    # 2. Try matching by email in UserProfile (for supervisors / super-admin)
    if not user:
        profile = db.query(UserProfile).filter(UserProfile.email.ilike(identifier)).first()
        if profile:
            user = profile.user
            
    # 3. Try matching by GreenPay ID (GP-XXXXXX)
    if not user and identifier.upper().startswith("GP-"):
        user = db.query(User).filter(User.greenpay_id == identifier.upper()).first()
        
    if not user or not verify_password(payload.password, user.password_hash):
        failed_count, locked_minutes = SecurityService.record_failed_login(db, identifier, client_ip)
        if locked_minutes:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account locked for {locked_minutes} minutes."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your electricity meter number / email and password."
        )
        
    if user.status == "DELETED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted under DPDP erasure request."
        )
    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact municipal operations."
        )
        
    # Clear any recorded failed login attempts on successful password verification
    SecurityService.clear_failed_logins(db, identifier)
    
    # Check if user requires 2FA (Supervisors / Super-Admins with 2FA enabled)
    if user.role in ("SUPERVISOR", "SUPER_ADMIN"):
        admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == user.id, Admin2FA.is_enabled == True).first()
        if admin_2fa:
            temp_token = create_access_token(user.id, user.role, expires_delta=timedelta(minutes=5))
            return AuthResponse(
                requires_2fa=True,
                temp_token=temp_token,
                role=user.role,
                name=user.profile.name if user.profile else "Admin",
                ward_name=user.profile.ward.name if user.profile and user.profile.ward else None
            )
        
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    csrf_token = generate_csrf_token()
    
    _set_auth_cookies(response, access_token, refresh_token, csrf_token, user.role)
    
    # Record active session
    user_agent = request.headers.get("User-Agent", "Browser Session")
    SecurityService.create_session(db, user.id, device_browser=user_agent, ip=client_ip)
    
    masked_meter = None
    if user.meter_number_encrypted:
        from app.core.security import decrypt_meter_number
        decrypted = decrypt_meter_number(user.meter_number_encrypted)
        masked_meter = mask_meter_number(decrypted)
        
    ward_name = user.profile.ward.name if user.profile and user.profile.ward else None
    user_name = user.profile.name if user.profile else "User"
    
    return AuthResponse(
        access_token=access_token,
        role=user.role,
        greenpay_id=user.greenpay_id,
        user_status=user.status,
        csrf_token=csrf_token,
        masked_meter=masked_meter,
        name=user_name,
        ward_name=ward_name
    )

@router.post("/admin/2fa-challenge", response_model=AuthResponse)
def admin_2fa_challenge(
    payload: Admin2FAChallengeRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    token_data = decode_token(payload.temp_token)
    if not token_data or token_data.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA session has expired. Please re-enter your username and password."
        )
    user_id = token_data.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ("SUPERVISOR", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized 2FA challenge."
        )
    admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == user.id, Admin2FA.is_enabled == True).first()
    if not admin_2fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not active on this account."
        )
        
    verified = False
    if payload.totp_code:
        verified = SecurityService.verify_totp(admin_2fa.totp_secret, payload.totp_code)
    elif payload.recovery_code:
        verified = SecurityService.verify_and_consume_recovery_code(db, admin_2fa, payload.recovery_code)
        
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code or recovery code. Please check your authenticator app or backup codes."
        )
        
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    csrf_token = generate_csrf_token()
    
    _set_auth_cookies(response, access_token, refresh_token, csrf_token, user.role)
    
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Admin Browser")
    SecurityService.create_session(db, user.id, device_browser=user_agent, ip=client_ip)
    
    ward_name = user.profile.ward.name if user.profile and user.profile.ward else None
    user_name = user.profile.name if user.profile else "Admin"
    
    return AuthResponse(
        access_token=access_token,
        role=user.role,
        greenpay_id=user.greenpay_id,
        user_status=user.status,
        csrf_token=csrf_token,
        masked_meter=None,
        name=user_name,
        ward_name=ward_name
    )

@router.post("/refresh", response_model=AuthResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    refresh_token = (
        request.cookies.get(settings.CITIZEN_REFRESH_COOKIE)
        or request.cookies.get(settings.ADMIN_REFRESH_COOKIE)
    )
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing."
        )
        
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status in ("DELETED", "SUSPENDED"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active."
        )
        
    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id, user.role)
    new_csrf = generate_csrf_token()
    
    _set_auth_cookies(response, new_access, new_refresh, new_csrf, user.role)
    
    masked_meter = None
    if user.meter_number_encrypted:
        from app.core.security import decrypt_meter_number
        masked_meter = mask_meter_number(decrypt_meter_number(user.meter_number_encrypted))
        
    ward_name = user.profile.ward.name if user.profile and user.profile.ward else None
    
    return AuthResponse(
        access_token=new_access,
        role=user.role,
        greenpay_id=user.greenpay_id,
        user_status=user.status,
        csrf_token=new_csrf,
        masked_meter=masked_meter,
        name=user.profile.name if user.profile else "User",
        ward_name=ward_name
    )

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    token = (
        request.cookies.get(settings.CITIZEN_ACCESS_COOKIE)
        or request.cookies.get(settings.ADMIN_ACCESS_COOKIE)
    )
    role = "CITIZEN"
    if token:
        payload = decode_token(token)
        if payload:
            role = payload.get("role", "CITIZEN")
            
    _clear_auth_cookies(response, role)
    return {"message": "Logged out successfully. Authentication and CSRF cookies cleared."}

@router.post("/admin-login", response_model=AuthResponse)
def admin_login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Dedicated admin & supervisor authentication endpoint.
    Strictly verifies supervisor or super_admin role and sets gp_admin_* cookies.
    """
    auth_resp = login(payload, response, request, db)
    if auth_resp.role not in ("SUPERVISOR", "SUPER_ADMIN"):
        _clear_auth_cookies(response, auth_resp.role)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized supervisors and administrators only."
        )
    return auth_resp

@router.get("/me")
def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db)
):
    """Returns profile for currently authenticated user via session cookie."""
    token = (
        request.cookies.get(settings.ADMIN_ACCESS_COOKIE)
        or request.cookies.get(settings.CITIZEN_ACCESS_COOKIE)
    )
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated."
        )
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token."
        )
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status in ("DELETED", "SUSPENDED"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active."
        )
        
    ward_name = user.profile.ward.name if user.profile and user.profile.ward else None
    user_name = user.profile.name if user.profile else "User"
    user_email = user.profile.email if user.profile else None
    
    return {
        "id": user.id,
        "email": user_email,
        "role": user.role,
        "status": user.status,
        "greenpay_id": user.greenpay_id,
        "profile": {
            "name": user_name,
            "ward_id": user.profile.ward_id if user.profile else None,
            "ward_name": ward_name
        }
    }
