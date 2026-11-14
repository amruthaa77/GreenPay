import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        actor_id: Optional[str],
        actor_role: str,
        action: str,
        affected_entity_type: str,
        affected_entity_id: Optional[str] = None,
        diff: Optional[Any] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        diff_str = json.dumps(diff) if isinstance(diff, (dict, list)) else (str(diff) if diff else None)
        
        log = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            affected_entity_type=affected_entity_type,
            affected_entity_id=affected_entity_id,
            diff=diff_str,
            ip_address=ip_address
        )
        db.add(log)
        db.flush()
        return log
