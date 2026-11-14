from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from app.models.base import BaseModel

class LoginAttempt(BaseModel):
    __tablename__ = "login_attempts"
    
    identifier = Column(String(255), index=True, nullable=False) # Meter or Email or IP
    failed_attempts = Column(Integer, default=1, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_failed_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    
    def is_locked(self) -> bool:
        if not self.locked_until:
            return False
        now = datetime.now(timezone.utc)
        locked = self.locked_until if self.locked_until.tzinfo else self.locked_until.replace(tzinfo=timezone.utc)
        return now < locked
