"""initial_schema_with_phase_a

Revision ID: 8b3b9f748bd7
Revises: 
Create Date: 2026-11-12 16:26:24.078440

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b3b9f748bd7'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Creates Phase A foundational tables in topological dependency order."""
    bind = op.get_bind()
    try:
        insp = sa.inspect(bind)
        tables = insp.get_table_names()
    except Exception:
        tables = []

    # 1. Wards table
    if 'wards' not in tables:
        op.create_table(
            'wards',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('zone', sa.String(length=50), nullable=False),
            sa.Column('is_demo_data', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_wards_id', 'wards', ['id'], unique=False)
        op.create_index('ix_wards_name', 'wards', ['name'], unique=True)

    # 2. Users table
    if 'users' not in tables:
        op.create_table(
            'users',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('meter_number_hash', sa.String(length=64), nullable=True),
            sa.Column('meter_number_encrypted', sa.Text(), nullable=True),
            sa.Column('greenpay_id', sa.String(length=20), nullable=True),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('role', sa.String(length=20), server_default='CITIZEN', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
            sa.Column('is_adult_declared', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('pseudonymous_id', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_users_id', 'users', ['id'], unique=False)
        op.create_index('ix_users_meter_number_hash', 'users', ['meter_number_hash'], unique=True)
        op.create_index('ix_users_greenpay_id', 'users', ['greenpay_id'], unique=True)
        op.create_index('ix_users_pseudonymous_id', 'users', ['pseudonymous_id'], unique=True)

    # 3. User Profiles table
    if 'user_profiles' not in tables:
        op.create_table(
            'user_profiles',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('address', sa.String(length=255), nullable=True),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=True),
            sa.Column('phone_number', sa.String(length=20), nullable=True),
            sa.Column('green_score', sa.Float(), server_default='50.0', nullable=False),
            sa.Column('streak_weeks', sa.Integer(), server_default='0', nullable=False),
            sa.Column('email_marketing_opt_in', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('unsubscribe_token', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_user_profiles_id', 'user_profiles', ['id'], unique=False)
        op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'], unique=True)
        op.create_index('ix_user_profiles_ward_id', 'user_profiles', ['ward_id'], unique=False)
        op.create_index('ix_user_profiles_unsubscribe_token', 'user_profiles', ['unsubscribe_token'], unique=True)

    # 4. Waste Entries table
    if 'waste_entries' not in tables:
        op.create_table(
            'waste_entries',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('transaction_id', sa.String(length=50), nullable=False),
            sa.Column('idempotency_key', sa.String(length=64), nullable=True),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('supervisor_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
            sa.Column('wet_kg', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('dry_kg', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('hazardous_kg', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('ewaste_kg', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('confirmation_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('collection_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_waste_entries_id', 'waste_entries', ['id'], unique=False)
        op.create_index('ix_waste_entries_transaction_id', 'waste_entries', ['transaction_id'], unique=True)
        op.create_index('ix_waste_entries_idempotency_key', 'waste_entries', ['idempotency_key'], unique=True)
        op.create_index('ix_waste_entries_user_id', 'waste_entries', ['user_id'], unique=False)
        op.create_index('ix_waste_entries_supervisor_id', 'waste_entries', ['supervisor_id'], unique=False)
        op.create_index('ix_waste_entries_ward_id', 'waste_entries', ['ward_id'], unique=False)
        op.create_index('ix_waste_entries_collection_date', 'waste_entries', ['collection_date'], unique=False)

    # 5. Credit Transactions table (Append-only Ledger)
    if 'credit_transactions' not in tables:
        op.create_table(
            'credit_transactions',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
            sa.Column('pseudonymous_owner', sa.String(length=50), nullable=True),
            sa.Column('waste_entry_id', sa.String(length=36), sa.ForeignKey('waste_entries.id', ondelete='SET NULL'), nullable=True),
            sa.Column('schedule_version', sa.Integer(), nullable=False),
            sa.Column('credits_amount', sa.Float(), nullable=False),
            sa.Column('calculation_formula', sa.String(length=255), nullable=False),
            sa.Column('is_reversal', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('reversal_of_id', sa.String(length=36), sa.ForeignKey('credit_transactions.id', ondelete='SET NULL'), nullable=True),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_credit_transactions_id', 'credit_transactions', ['id'], unique=False)
        op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'], unique=False)
        op.create_index('ix_credit_transactions_pseudonymous_owner', 'credit_transactions', ['pseudonymous_owner'], unique=False)
        op.create_index('ix_credit_transactions_waste_entry_id', 'credit_transactions', ['waste_entry_id'], unique=False)
        op.create_index('ix_credit_transactions_timestamp', 'credit_transactions', ['timestamp'], unique=False)

    # 6. Reward Schedules table
    if 'reward_schedules' not in tables:
        op.create_table(
            'reward_schedules',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('wet_rate', sa.Float(), nullable=False),
            sa.Column('dry_rate', sa.Float(), nullable=False),
            sa.Column('hazardous_rate', sa.Float(), nullable=False),
            sa.Column('ewaste_rate', sa.Float(), nullable=False),
            sa.Column('rates_json', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('effective_from', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('change_reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_reward_schedules_id', 'reward_schedules', ['id'], unique=False)
        op.create_index('ix_reward_schedules_version', 'reward_schedules', ['version'], unique=True)

    # 7. Supervisor Invites table
    if 'supervisor_invites' not in tables:
        op.create_table(
            'supervisor_invites',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('token_hash', sa.String(length=64), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('assigned_ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('used', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_supervisor_invites_id', 'supervisor_invites', ['id'], unique=False)
        op.create_index('ix_supervisor_invites_token_hash', 'supervisor_invites', ['token_hash'], unique=True)
        op.create_index('ix_supervisor_invites_email', 'supervisor_invites', ['email'], unique=False)

    # 8. Anomaly Flags table
    if 'anomaly_flags' not in tables:
        op.create_table(
            'anomaly_flags',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('waste_entry_id', sa.String(length=36), sa.ForeignKey('waste_entries.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
            sa.Column('anomaly_type', sa.String(length=50), nullable=False),
            sa.Column('z_score_household', sa.Float(), nullable=True),
            sa.Column('z_score_ward', sa.Float(), nullable=True),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('severity', sa.String(length=20), server_default='MEDIUM', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
            sa.Column('reviewed_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('review_notes', sa.Text(), nullable=True),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_anomaly_flags_id', 'anomaly_flags', ['id'], unique=False)
        op.create_index('ix_anomaly_flags_waste_entry_id', 'anomaly_flags', ['waste_entry_id'], unique=False)
        op.create_index('ix_anomaly_flags_user_id', 'anomaly_flags', ['user_id'], unique=False)
        op.create_index('ix_anomaly_flags_status', 'anomaly_flags', ['status'], unique=False)

    # 9. Audit Logs table
    if 'audit_logs' not in tables:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('actor_id', sa.String(length=36), nullable=True),
            sa.Column('actor_role', sa.String(length=30), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('affected_entity_type', sa.String(length=50), nullable=True),
            sa.Column('affected_entity_id', sa.String(length=36), nullable=True),
            sa.Column('diff', sa.Text(), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_audit_logs_id', 'audit_logs', ['id'], unique=False)
        op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'], unique=False)
        op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
        op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False)

    # 10. Consent Records table (DPDP Act 2023)
    if 'consent_records' not in tables:
        op.create_table(
            'consent_records',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('consent_type', sa.String(length=50), nullable=False),
            sa.Column('consent_version', sa.String(length=20), nullable=False),
            sa.Column('granted', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_consent_records_id', 'consent_records', ['id'], unique=False)
        op.create_index('ix_consent_records_user_id', 'consent_records', ['user_id'], unique=False)

    # 11. Password Reset Tokens table
    if 'password_reset_tokens' not in tables:
        op.create_table(
            'password_reset_tokens',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('token_hash', sa.String(length=64), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('used', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_password_reset_tokens_id', 'password_reset_tokens', ['id'], unique=False)
        op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=True)
        op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'], unique=False)

    # 12. Phone Verifications table
    if 'phone_verifications' not in tables:
        op.create_table(
            'phone_verifications',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('phone_encrypted', sa.Text(), nullable=False),
            sa.Column('phone_hash', sa.String(length=64), nullable=False),
            sa.Column('otp_hash', sa.String(length=64), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('attempts_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('resend_available_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_phone_verifications_id', 'phone_verifications', ['id'], unique=False)
        op.create_index('ix_phone_verifications_user_id', 'phone_verifications', ['user_id'], unique=False)
        op.create_index('ix_phone_verifications_phone_hash', 'phone_verifications', ['phone_hash'], unique=False)

    # 13. Admin 2FA table
    if 'admin_2fa' not in tables:
        op.create_table(
            'admin_2fa',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('totp_secret_encrypted', sa.Text(), nullable=True),
            sa.Column('is_enabled', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('recovery_codes_hashed', sa.Text(), nullable=True),
            sa.Column('enrolled_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_admin_2fa_id', 'admin_2fa', ['id'], unique=False)
        op.create_index('ix_admin_2fa_user_id', 'admin_2fa', ['user_id'], unique=True)
    else:
        cols = [c['name'] for c in insp.get_columns('admin_2fa')]
        if 'enrolled_at' not in cols:
            with op.batch_alter_table('admin_2fa', schema=None) as batch_op:
                batch_op.add_column(sa.Column('enrolled_at', sa.DateTime(timezone=True), nullable=True))
                batch_op.alter_column('totp_secret_encrypted', existing_type=sa.TEXT(), nullable=True)
                batch_op.alter_column('recovery_codes_hashed', existing_type=sa.TEXT(), nullable=True)

    # 14. User Sessions table
    if 'user_sessions' not in tables:
        op.create_table(
            'user_sessions',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('session_id', sa.String(length=64), nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('device_browser', sa.String(length=255), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('last_active_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('is_revoked', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_user_sessions_id', 'user_sessions', ['id'], unique=False)
        op.create_index('ix_user_sessions_session_id', 'user_sessions', ['session_id'], unique=True)
        op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], unique=False)

    # 15. Login Attempts table (Account Lockout)
    if 'login_attempts' not in tables:
        op.create_table(
            'login_attempts',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('identifier', sa.String(length=255), nullable=False),
            sa.Column('failed_attempts', sa.Integer(), server_default='1', nullable=False),
            sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
            sa.Column('last_failed_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_login_attempts_id', 'login_attempts', ['id'], unique=False)
        op.create_index('ix_login_attempts_identifier', 'login_attempts', ['identifier'], unique=False)

    # 16. Notifications table
    if 'notifications' not in tables:
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('title_key', sa.String(length=100), nullable=False),
            sa.Column('message_key', sa.String(length=100), nullable=False),
            sa.Column('params_json', sa.Text(), nullable=True),
            sa.Column('is_read', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_notifications_id', 'notifications', ['id'], unique=False)
        op.create_index('ix_notifications_user_id', 'notifications', ['user_id'], unique=False)

    # 17. Notification Preferences table
    if 'notification_preferences' not in tables:
        op.create_table(
            'notification_preferences',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('in_app_enabled', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('email_enabled', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('sms_enabled', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_notification_preferences_id', 'notification_preferences', ['id'], unique=False)
        op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
    op.drop_table('login_attempts')
    op.drop_table('user_sessions')
    op.drop_table('admin_2fa')
    op.drop_table('phone_verifications')
    op.drop_table('password_reset_tokens')
    op.drop_table('consent_records')
    op.drop_table('audit_logs')
    op.drop_table('anomaly_flags')
    op.drop_table('supervisor_invites')
    op.drop_table('reward_schedules')
    op.drop_table('credit_transactions')
    op.drop_table('waste_entries')
    op.drop_table('user_profiles')
    op.drop_table('users')
    op.drop_table('wards')
