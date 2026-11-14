from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core.security import decode_token, verify_csrf_token
from app.models.user import User

def get_token_from_request(request: Request, app_type: str = "auto") -> Optional[str]:
    """
    Extracts JWT from Bearer header or app-scoped cookie.
    app_type can be 'citizen', 'admin', or 'auto'.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
        
    path = request.url.path
    if app_type == "citizen" or (app_type == "auto" and "/citizen" in path):
        return request.cookies.get(settings.CITIZEN_ACCESS_COOKIE)
    elif app_type == "admin" or (app_type == "auto" and ("/admin" in path or "/supervisor" in path)):
        return request.cookies.get(settings.ADMIN_ACCESS_COOKIE)
        
    # Fallback to checking either cookie
    return (
        request.cookies.get(settings.CITIZEN_ACCESS_COOKIE)
        or request.cookies.get(settings.ADMIN_ACCESS_COOKIE)
    )

def verify_csrf(request: Request):
    """
    Enforces double-submit CSRF cookie pattern on state-changing requests.
    Exempts GET, HEAD, OPTIONS.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return True
        
    # Check header
    header_csrf = request.headers.get("X-CSRF-Token")
    
    # Check corresponding cookie
    path = request.url.path
    if "/admin" in path or "/supervisor" in path:
        cookie_csrf = request.cookies.get(settings.ADMIN_CSRF_COOKIE)
    else:
        cookie_csrf = request.cookies.get(settings.CITIZEN_CSRF_COOKIE)
        
    # If using Cookie-based auth, CSRF header is mandatory
    has_auth_cookie = (
        request.cookies.get(settings.CITIZEN_ACCESS_COOKIE) or
        request.cookies.get(settings.ADMIN_ACCESS_COOKIE)
    )
    if has_auth_cookie:
        if not verify_csrf_token(cookie_csrf, header_csrf):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Missing or mismatched double-submit token."
            )
    return True

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    _csrf: bool = Depends(verify_csrf)
) -> User:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided."
        )
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found."
        )
        
    if user.status == "DELETED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted under DPDP erasure request."
        )
        
    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended."
        )
        
    return user

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        token = get_token_from_request(request)
        if not token:
            return None
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id, User.status != "DELETED").first()
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles} (current role: {current_user.role})."
            )
        return current_user
    return role_checker

# Pre-configured role dependencies
require_citizen = require_role(["CITIZEN"])
require_supervisor = require_role(["SUPERVISOR", "SUPER_ADMIN"])
require_super_admin = require_role(["SUPER_ADMIN"])
