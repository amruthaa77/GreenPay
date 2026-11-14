import uuid
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.credit_ledger import CreditTransaction
from app.models.audit import AuditLog

class AccountService:
    @staticmethod
    def delete_and_pseudonymise_citizen(db: Session, user: User, client_ip: str = None) -> str:
        """
        Executes DPDP Act 2023 compliant self-serve account deletion:
        - Erases all personal identifiers (name, encrypted meter number, contact).
        - Preserves municipal audit trail and credit ledger immutability under a pseudonymous ID.
        """
        pseudonymous_id = f"ANON-{uuid.uuid4().hex[:12].upper()}"
        user_id_ref = user.id
        
        # 1. Do NOT update credit_transactions (DB trigger prohibits updates; append-only!)
        # The user record itself is pseudonymised, decoupling all ledger entries from PII.
        
        # 2. Erase PII from User and Profile
        user.pseudonymous_id = pseudonymous_id
        user.meter_number_hash = None
        user.meter_number_encrypted = None
        user.password_hash = "[SCRUBBED_ACCOUNT_DELETED]"
        user.status = "DELETED"
        
        if user.profile:
            user.profile.name = "[DELETED CITIZEN]"
            user.profile.email = None
            user.profile.phone_number = None
            user.profile.address = None
            user.profile.unsubscribe_token = None
            user.profile.email_marketing_opt_in = False
            
        # 3. Create Audit Log for compliance
        audit = AuditLog(
            actor_id=pseudonymous_id,
            actor_role="CITIZEN",
            action="DPDP_ACCOUNT_DELETION_PSEUDONYMISED",
            affected_entity_type="User",
            affected_entity_id=user_id_ref,
            diff=f'{{"status": "DELETED", "pseudonymous_id": "{pseudonymous_id}", "erased_fields": ["meter_number", "name", "email", "phone"]}}',
            ip_address=client_ip
        )
        db.add(audit)
        db.commit()
        
        return pseudonymous_id
