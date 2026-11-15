import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.config import settings
from app.database import Base
import app.models # Ensures all models are registered on Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def get_database_url() -> str:
    """
    Resolves and normalizes the target database URL with the following priority:
    1. os.environ['DATABASE_URL'] (direct deployment environment variable)
    2. settings.DATABASE_URL (application pydantic settings)
    3. alembic.ini option (only if not a placeholder like 'driver://')
    """
    raw_url = os.environ.get("DATABASE_URL") or getattr(settings, "DATABASE_URL", None)
    if not raw_url:
        ini_url = config.get_main_option("sqlalchemy.url")
        if ini_url and not ini_url.startswith("driver://") and "user:pass@localhost" not in ini_url:
            raw_url = ini_url

    if not raw_url or raw_url.startswith("driver://") or "user:pass@localhost" in raw_url:
        raise ValueError(
            "FATAL CONFIGURATION ERROR: A valid DATABASE_URL was not found. "
            "Alembic detected missing configuration or the unconfigured placeholder 'driver://user:pass@localhost/dbname'. "
            "Please provide a real DATABASE_URL environment variable (e.g. postgresql+psycopg://... or postgres://...)."
        )

    # Normalize PostgreSQL dialect for psycopg 3
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
        raw_url = raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return raw_url

db_url = get_database_url()

# Sync with config (escape '%' for configparser safety)
config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = config.attributes.get("connection", None)

    if connectable is None:
        configuration = config.get_section(config.config_ini_section, {})
        configuration["sqlalchemy.url"] = db_url
        connectable = engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
