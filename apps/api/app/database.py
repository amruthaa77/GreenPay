from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enforce SQLite foreign keys
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def install_ledger_immutability_triggers(target_engine=None):
    """
    Installs database-level triggers preventing UPDATE and DELETE on credit_transactions.
    Supports both SQLite (for zero-config dev and local tests) and PostgreSQL (for CI and prod).
    """
    eng = target_engine or engine
    dialect = eng.dialect.name
    
    with eng.begin() as conn:
        if dialect == "sqlite":
            conn.execute(text("""
                CREATE TRIGGER IF NOT EXISTS prevent_credit_ledger_update
                BEFORE UPDATE ON credit_transactions
                BEGIN
                    SELECT RAISE(FAIL, 'Credit ledger transactions are append-only. Updates are strictly prohibited.');
                END;
            """))
            conn.execute(text("""
                CREATE TRIGGER IF NOT EXISTS prevent_credit_ledger_delete
                BEFORE DELETE ON credit_transactions
                BEGIN
                    SELECT RAISE(FAIL, 'Credit ledger transactions are append-only. Deletions are strictly prohibited.');
                END;
            """))
        elif dialect == "postgresql":
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION prevent_credit_ledger_modification()
                RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION 'Credit ledger transactions are append-only. Modifications and deletions are strictly prohibited.';
                END;
                $$ LANGUAGE plpgsql;
            """))
            conn.execute(text("""
                DROP TRIGGER IF EXISTS trg_prevent_credit_ledger_mod ON credit_transactions;
                CREATE TRIGGER trg_prevent_credit_ledger_mod
                BEFORE UPDATE OR DELETE ON credit_transactions
                FOR EACH ROW EXECUTE FUNCTION prevent_credit_ledger_modification();
            """))

def init_db(target_engine=None):
    """Initializes tables and attaches immutability triggers."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    install_ledger_immutability_triggers(eng)

    from sqlalchemy.orm import sessionmaker
    from app.models.ward import Ward
    from app.models.reward_schedule import RewardSchedule
    from app.models.dry_waste import DryWasteCategory
    SessionLocalInit = sessionmaker(bind=eng)
    db = SessionLocalInit()
    try:
        if db.query(Ward).count() == 0:
            wards = [
                Ward(name="Koramangala", zone="South"),
                Ward(name="Indiranagar", zone="East"),
                Ward(name="Jayanagar", zone="South"),
                Ward(name="Whitefield", zone="Mahadevapura"),
            ]
            db.add_all(wards)
        if db.query(RewardSchedule).count() == 0:
            sch = RewardSchedule(
                version=1,
                wet_rate=2.0,
                dry_rate=10.0,
                hazardous_rate=5.0,
                ewaste_rate=25.0,
                is_active=True,
                change_reason="Initial baseline municipal reward schedule"
            )
            db.add(sch)
            
        # Seed 8 official dry waste categories if not already present
        initial_categories = [
            ("aluminium_metal", "Aluminium & Metal", 22.0, "Clean beverage cans, food tins, foil, metal caps and household metallic items."),
            ("pet_bottles", "PET Bottles", 18.0, "Clear transparent or lightly tinted PET beverage bottles (resin code 1)."),
            ("other_recyclable_plastics", "Other Recyclable Plastics", 15.0, "Rigid HDPE, LDPE, and PP plastic containers, buckets, and shampoo bottles."),
            ("newspapers_magazines", "Newspapers & Magazines", 10.0, "Dry daily newspapers, printed magazines, inserts, and periodicals."),
            ("cardboard", "Cardboard", 10.0, "Flattened corrugated cardboard delivery boxes, brown carton packaging, and clean kraft paper."),
            ("glass_bottles", "Glass Bottles", 8.0, "Intact glass bottles and jars (amber, green, clear) rinsed and separated from caps."),
            ("textiles", "Textiles", 8.0, "Clean, dry unsoiled clothing, fabric scraps, linen, curtains, and recyclable cloth."),
            ("mixed_paper", "Mixed Paper", 7.0, "Office white paper, notebook sheets, envelopes, flyers, and clean shredded paper."),
        ]
        for code, name, rate, desc in initial_categories:
            if not db.query(DryWasteCategory).filter(DryWasteCategory.code == code).first():
                db.add(DryWasteCategory(
                    code=code,
                    name=name,
                    rate_per_kg=rate,
                    description=desc,
                    is_active=True
                ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
