from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_role: str
    action: str
    affected_entity_type: str
    affected_entity_id: Optional[str] = None
    diff: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class SupervisorInviteCreateRequest(BaseModel):
    name: str
    email: str
    assigned_ward_name: str

class SupervisorInviteResponse(BaseModel):
    id: str
    name: str
    email: str
    assigned_ward_name: str
    invite_url: str
    expires_at: datetime
    used: bool

    model_config = ConfigDict(from_attributes=True)
