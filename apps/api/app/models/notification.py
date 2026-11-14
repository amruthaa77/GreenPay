from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Notification(BaseModel):
    __tablename__ = "notifications"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False) # COLLECTION_LOGGED, CREDITS_MODIFIED, TICKET_UPDATE, SCHEDULE_CHANGE, SECURITY_NOTICE, REMINDER
    title_key = Column(String(100), nullable=False) # i18n translation key
    message_key = Column(String(100), nullable=False) # i18n translation key
    params_json = Column(Text, nullable=True) # JSON payload for i18n parameter interpolation
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

class NotificationPreference(BaseModel):
    __tablename__ = "notification_preferences"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False) # COLLECTION_LOGGED, CREDITS_MODIFIED, TICKET_UPDATE, SCHEDULE_CHANGE, REMINDER
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    sms_enabled = Column(Boolean, default=False, nullable=False) # Optional, separate consent
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
