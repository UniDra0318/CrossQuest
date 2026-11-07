import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, ForeignKey, Text, JSON, Float
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class ClientCompany(Base):
    __tablename__ = "client_companies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. 'CORP_ALPHA'
    name = Column(String(200), nullable=False)
    client_type = Column(String(20), default="COMPANY", nullable=False) # "COMPANY" or "INDIVIDUAL" (FR-05)
    industry = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trainees = relationship("Trainee", back_populates="current_company")
    training_records = relationship("TrainingRecord", back_populates="company_at_completion")
    am_assignments = relationship("AccountManagerAssignment", back_populates="company")
    affiliations = relationship("TraineeAffiliation", back_populates="company")


class User(Base):
    """System user account.
    
    Roles supported:
    - admin: Administrator
    - account_manager: Account Manager (scoped to assigned clients)
    - finance: Finance personnel (enterprise view, add/edit, no delete)
    - trainer: Trainer (assigned sessions only, manages quizzes/gamification)
    - trainee: Trainee (views own training record & certifications across companies)
    Note: Client companies receive no system accounts.
    Note: No clearance levels are used per Crossworks uniform sensitivity confirmation (SEC-11).
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="account_manager")
    clearance_level = Column(Integer, default=1, nullable=True)
    
    # Assigned client accounts for Account Managers (list of company codes, e.g. ["CORP_ALPHA"])
    assigned_client_accounts = Column(JSON, default=list)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    force_password_change = Column(Boolean, default=False)
    
    # MFA for Admin & Finance (SEC-01, OI-26)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(64), nullable=True) # Base32 secret for pyotp
    mfa_recovery_codes = Column(JSON, default=list) # List of SHA-256 hashed single-use recovery codes
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    access_logs = relationship("AccessLog", back_populates="actor_user", foreign_keys="AccessLog.actor_user_id")
    trainee_profile = relationship("Trainee", uselist=False, back_populates="user_account")
    am_assignments = relationship("AccountManagerAssignment", back_populates="user", foreign_keys="AccountManagerAssignment.user_id")
    trainer_assignments = relationship("TrainerAssignment", back_populates="user", foreign_keys="TrainerAssignment.user_id")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")



class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_code = Column(String(50), unique=True, index=True, nullable=False) # Pseudonymous ID e.g. 'TRN-9021'
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True) # Linked login account
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True) # Trainee nickname for leaderboard privacy (GAM-04)
    phone = Column(String(50), nullable=True)
    
    # Current active company affiliation
    current_company_id = Column(String(36), ForeignKey("client_companies.id"), nullable=True)
    leaderboard_opt_out = Column(Boolean, default=False) # OI-03 opt-out from company leaderboard
    current_streak = Column(Integer, default=0) # Activity streak in days
    last_activity_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_account = relationship("User", back_populates="trainee_profile")
    current_company = relationship("ClientCompany", back_populates="trainees")
    training_records = relationship("TrainingRecord", back_populates="trainee")
    certificates = relationship("Certificate", back_populates="trainee")
    affiliations = relationship("TraineeAffiliation", back_populates="trainee")
    gamification = relationship("GamificationProgress", uselist=False, back_populates="trainee")
    team_memberships = relationship("TeamMember", back_populates="trainee")


class TraineeAffiliation(Base):
    """Historical record of trainee employment affiliations over time.
    Preserves historical affiliation when trainees change employers (FR-15, Section 3.5.3).
    """
    __tablename__ = "trainee_affiliations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    company_id = Column(String(36), ForeignKey("client_companies.id"), nullable=False)
    valid_from = Column(DateTime, nullable=False, default=datetime.utcnow)
    valid_to = Column(DateTime, nullable=True) # None = current active employer

    trainee = relationship("Trainee", back_populates="affiliations")
    company = relationship("ClientCompany", back_populates="affiliations")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    acronym_3 = Column(String(10), nullable=True) # Official pilot three-letter acronym (e.g. PMP, BSS, CRM, SEC)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("TrainingSession", back_populates="course")


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. 'SESS-2026-08A'
    course_id = Column(String(36), ForeignKey("courses.id"), nullable=True)
    course_name = Column(String(200), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    delivery_type = Column(String(50), default="Public") # Public, Dedicated
    delivery_mode = Column(String(50), default="F2F") # F2F, Online, Hybrid
    venue = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Trainer Sign-off Workflow (Phase 2, Section 3.5.3)
    trainer_signed_off = Column(Boolean, default=False)
    trainer_sign_off_at = Column(DateTime, nullable=True)
    trainer_sign_off_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    trainer_sign_off_notes = Column(Text, nullable=True)

    course = relationship("Course", back_populates="sessions")
    training_records = relationship("TrainingRecord", back_populates="session")
    trainer_assignments = relationship("TrainerAssignment", back_populates="session")
    quizzes = relationship("Quiz", back_populates="session")
    teams = relationship("Team", back_populates="session")


class AccountManagerAssignment(Base):
    """Maps Account Managers to assigned client companies (FR-03, Table 15)."""
    __tablename__ = "account_manager_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    company_id = Column(String(36), ForeignKey("client_companies.id"), nullable=False)
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True) # None = currently assigned
    assigned_by = Column(String(36), nullable=True)

    user = relationship("User", back_populates="am_assignments")
    company = relationship("ClientCompany", back_populates="am_assignments")


class TrainerAssignment(Base):
    """Maps Trainers to assigned training sessions (FR-04, Table 15)."""
    __tablename__ = "trainer_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=False)
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_to = Column(DateTime, nullable=True) # None = currently assigned

    user = relationship("User", back_populates="trainer_assignments")
    session = relationship("TrainingSession", back_populates="trainer_assignments")


class TrainingRecord(Base):
    """Training record entity with DD-02 separation of queryable plaintext vs hybrid CP-ABE ciphertext.
    
    Plaintext columns: for RLS, reporting, and progress tracking without decryption.
    Encrypted fields: score, assessment details, certificates references, trainer remarks.
    Deletion: implemented as soft deletion reserved for Administrators (DD-06, FR-08).
    """
    __tablename__ = "training_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=True)
    
    # Preserves historical affiliation: client company in effect at time of training (FR-15)
    company_at_completion_id = Column(String(36), ForeignKey("client_companies.id"), nullable=False)
    course_name = Column(String(200), nullable=False)
    
    # Completion statuses: Enrolled, In progress, Completed, Not completed (Section 3.5.3)
    status = Column(String(50), default="In progress")
    attendance_status = Column(String(50), default="Present") # Present, Absent, Excused
    completion_date = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True) # Kept in plaintext for progress count; official sensitive details encrypted

    # CP-ABE Policy and Ciphertext Storage (Charm BSW07 + AES-256-GCM)
    encryption_policy = Column(String(500), nullable=False) # e.g. "ROLEADMIN or ROLEFINANCE or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEET0123"
    policy_version = Column(Integer, default=1)
    abe_ciphertext = Column(Text, nullable=True) # Encrypted pairing key element
    payload_ciphertext = Column(Text, nullable=False) # AES-256-GCM encrypted payload
    nonce = Column(String(64), nullable=True) # 12-byte GCM nonce (base64)
    is_encrypted = Column(Boolean, default=True)

    # Soft deletion: hidden from non-Admins, audited immediately (DD-06, FR-08, Section 3.5.3)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainee = relationship("Trainee", back_populates="training_records")
    session = relationship("TrainingSession", back_populates="training_records")
    company_at_completion = relationship("ClientCompany", back_populates="training_records")
    versions = relationship("TrainingRecordVersion", back_populates="record", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="record")
    deleted_by_user = relationship("User", foreign_keys=[deleted_by])


class TrainingRecordVersion(Base):
    """Maintains version history of encrypted record content on edit (DD-06, Section 3.5.2, p. 33)."""
    __tablename__ = "training_record_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String(36), ForeignKey("training_records.id"), nullable=False)
    version_no = Column(Integer, nullable=False)
    abe_ciphertext = Column(Text, nullable=True)
    payload_ciphertext = Column(Text, nullable=False)
    policy_tokens = Column(String(500), nullable=True)
    edited_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    edited_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text, nullable=True) # Mandatory reason logged for Admin and Finance edits

    record = relationship("TrainingRecord", back_populates="versions")
    edited_by_user = relationship("User", foreign_keys=[edited_by_user_id])



class CertificationType(Base):
    """Reference data for recognized certification types (Table 15, FR-18).
    Seeded with the 5 client-stated types: PMP, CAPM, PMI-ACP, CPMAI, ISO 31000 with 36 months validity.
    """
    __tablename__ = "certification_types"

    code = Column(String(50), primary_key=True) # e.g. 'PMP', 'CAPM', 'PMI_ACP', 'CPMAI', 'ISO_31000'
    name = Column(String(200), nullable=False)
    validity_months = Column(Integer, default=36) # 3 years
    validity_basis = Column(String(255), default="Crossworks stated 3-year validity period")


class Certificate(Base):
    """Certification lifecycle tracking entity (Section 3.8.2, Figure 16)."""
    __tablename__ = "certificates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String(36), ForeignKey("training_records.id"), nullable=True)
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    cert_type_code = Column(String(50), ForeignKey("certification_types.code"), nullable=True)
    title = Column(String(200), nullable=False)
    serial_number = Column(String(50), unique=True, index=True, nullable=True) # AAAYYYYMMDD-01 format
    issue_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True) # Null for non-expiring Crossworks completion certificates (U-17, Section 3.8.2)
    expiry_basis = Column(String(255), default="Calculated: issue_date + 36 months")
    
    # Status is dynamically calculated on read: Valid, Expiring soon (<=90 days), Expired
    status = Column(String(50), default="Valid") 
    is_nearing_renewal = Column(Boolean, default=False) # <=90 days

    # Reissue Tracking (Admin reissue with mandatory logged reason)
    reissue_count = Column(Integer, default=0)
    reissue_reason = Column(Text, nullable=True)
    reissued_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Trainee External Credential Renewal (Self-reported, HTTPS-only, zero server-side fetch)
    is_self_reported = Column(Boolean, default=False)
    credential_url = Column(String(500), nullable=True)

    trainee = relationship("Trainee", back_populates="certificates")
    record = relationship("TrainingRecord", back_populates="certificates")
    notifications = relationship("Notification", back_populates="certificate", cascade="all, delete-orphan")


class Notification(Base):
    """Certification expiry notifications generated for Trainee and assigned Account Manager (Section 3.8.3, Figure 16).
    Offsets: 90, 60, 30 days and 0 days (day of expiry).
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    certification_id = Column(String(36), ForeignKey("certificates.id"), nullable=False)
    offset_days = Column(Integer, nullable=False) # 90, 60, 30, 0
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    certificate = relationship("Certificate", back_populates="notifications")


class Quiz(Base):
    """Quiz entity managed by Trainers and Administrators (GAM-01, Table 15)."""
    __tablename__ = "quizzes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=True)
    title = Column(String(200), nullable=False)
    version_no = Column(Integer, default=1)
    available_until = Column(DateTime, nullable=True)
    is_closed = Column(Boolean, default=False) # SEC-26 hold back per-question correctness until closed
    closed_at = Column(DateTime, nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TrainingSession", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz")


class QuizQuestion(Base):
    """Quiz question entity (SEC-26).
    Correct answers and explanations are stored separately in QuizAnswerKey.
    """
    __tablename__ = "quiz_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String(36), ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # List of option strings
    correct_answer = Column(Integer, nullable=True) # Kept for fallback/compat, answer_key is authoritative
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=10)

    quiz = relationship("Quiz", back_populates="questions")
    answer_key = relationship("QuizAnswerKey", uselist=False, back_populates="question", cascade="all, delete-orphan")


class QuizAnswerKey(Base):
    """Separate quiz answer keys table (SEC-26).
    Kept separate from quiz questions so application queries and student endpoints
    cannot read answer keys directly. Scored via server-side function only.
    """
    __tablename__ = "quiz_answer_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String(36), ForeignKey("quiz_questions.id", ondelete="CASCADE"), unique=True, nullable=False)
    correct_answer = Column(Integer, nullable=False) # Index (0-based)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("QuizQuestion", back_populates="answer_key")


class QuizAttempt(Base):
    """Tracks trainee quiz submissions (online or synced from offline queue)."""
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4())) # Client-generated UUID for idempotency (DD-07)
    quiz_id = Column(String(36), ForeignKey("quizzes.id"), nullable=False)
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)
    quiz_version = Column(Integer, default=1)
    submitted_offline = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    total_points = Column(Integer, default=0)
    is_scored = Column(Boolean, default=True) # SEC-26 one scored attempt per quiz version
    submitted_at = Column(DateTime, default=datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")


class Team(Base):
    """Trainer-created team for gamified group scoring (GAM-03, Table 15)."""
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=False)
    team_name = Column(String(100), nullable=False)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TrainingSession", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    trainee_id = Column(String(36), ForeignKey("trainees.id"), nullable=False)

    team = relationship("Team", back_populates="members")
    trainee = relationship("Trainee", back_populates="team_memberships")


class GamificationProgress(Base):
    __tablename__ = "gamification_progress"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trainee_id = Column(String(36), ForeignKey("trainees.id"), unique=True, nullable=False)
    points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    badges = Column(JSON, default=list) # List of earned badge strings
    quizzes_completed = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trainee = relationship("Trainee", back_populates="gamification")


class AccessLog(Base):
    """Append-only audit log (Table 15, Table 19, SEC-12).
    Tracks every read/change of client data, login attempts, denials, and attribute operations.
    Retained for 12 months (SEC-13).
    """
    __tablename__ = "access_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    occurred_at = Column(DateTime, default=datetime.utcnow, index=True)
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=True) # Role at occurrence
    
    # Event types: AUTH_SUCCESS, AUTH_FAILURE, ACCESS_ALLOWED, ACCESS_DENIED, RECORD_CREATE, RECORD_EDIT, RECORD_DELETE, REPORT_GENERATED
    event_type = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=True) # RECORD, TRAINEE, REPORT, CERTIFICATE, ALERT
    resource_id = Column(String(36), nullable=True)
    company_id = Column(String(36), nullable=True)
    
    outcome = Column(String(50), nullable=False) # SUCCESS, DENIED, FAILED
    reason_code = Column(String(100), nullable=True)
    source_ip = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)

    actor_user = relationship("User", foreign_keys=[actor_user_id])


class AnomalyAlert(Base):
    """Access Anomaly Alert entity with full lifecycle support (Table 13, Section 3.7.5, Figure 10).
    
    Lifecycle:
    - NEW: freshly triggered by rule evaluator or immediate trigger (e.g. deletion)
    - UNDER_REVIEW: Administrator is actively reviewing
    - CLOSED: closed by Administrator with required note and disposition:
        * CLOSED_EXPECTED_ACTIVITY
        * CLOSED_FOLLOW_UP_REQUIRED
    
    Alerts are immutable and cannot be deleted (Table 15, p. 33).
    Severity scale: LOW, MEDIUM, HIGH (High is the maximum per Chapter III Section 3.7.3).
    No automatic account lock-out or restriction is triggered (SEC-15).
    """
    __tablename__ = "anomaly_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Rule codes: R1_OUT_OF_SCOPE, R1_REPEATED_OUT_OF_SCOPE, R2_FAILED_LOGINS_ACCOUNT, R2_FAILED_LOGINS_IP,
    # R3_HIGH_RECORD_ACCESS, R3_REPORT_BURSTS, R4_RECORD_DELETION, R4_RECORD_EDIT, R4_BULK_EDIT
    rule_code = Column(String(50), nullable=False)
    
    # Severity tracking (Chapter III Section 3.7.3, p. 53-54, 56)
    severity_base = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH
    severity_final = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH (max is HIGH)
    severity = Column(String(20), default="MEDIUM") # Kept for backward compatibility
    
    # Supporting indicator & episode tracking (Table 13, Section 3.7.4)
    after_hours_tag = Column(Boolean, default=False)
    episode_start = Column(DateTime, default=datetime.utcnow)
    client_reviewed = Column(Boolean, default=False)
    
    # Alert lifecycle (Section 3.7.5)
    status = Column(String(32), default="NEW") # NEW, UNDER_REVIEW, AWAITING_UNINVOLVED_ADMIN, CLOSED
    disposition = Column(String(50), nullable=True) # CLOSED_EXPECTED_ACTIVITY, CLOSED_FOLLOW_UP_REQUIRED
    review_note = Column(Text, nullable=True) # Required when closing
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    tags = Column(JSON, default=list) # e.g. ["after_hours"] if S1 triggered
    event_count = Column(Integer, default=1) # For aggregation
    description = Column(Text, nullable=False)
    metadata_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    subject_user = relationship("User", foreign_keys=[subject_user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
    events = relationship("AlertEvent", back_populates="alert", cascade="all, delete-orphan")


class AlertEvent(Base):
    """Junction linking AnomalyAlert to the AccessLog events that caused or joined it (Figure 10, p. 27, 33)."""
    __tablename__ = "alert_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String(36), ForeignKey("anomaly_alerts.id"), nullable=False)
    log_id = Column(String(36), ForeignKey("access_logs.id"), nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("AnomalyAlert", back_populates="events")
    log = relationship("AccessLog")


class AnomalyRule(Base):
    """Rule definition and thresholds (Figure 10, Table 13, Section 3.7.3)."""
    __tablename__ = "anomaly_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_code = Column(String(50), unique=True, nullable=False) # e.g. 'R1_a', 'R1_b', 'R2_a', 'R3_a'
    parameters = Column(JSON, default=dict)
    version_no = Column(Integer, default=1)
    client_reviewed = Column(Boolean, default=False)
    description = Column(Text, nullable=True)


class AbeAttribute(Base):
    """Attribute tokens with versions and status (Figure 11, Section 3.6.4, p. 28, 33)."""
    __tablename__ = "abe_attributes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    token = Column(String(100), unique=True, nullable=False, index=True) # e.g. 'ROLEADMINV1'
    attribute_type = Column(String(50), nullable=False) # ROLE, CLIENT, TRAINING, TRAINEE
    ref_code = Column(String(100), nullable=True)
    version = Column(Integer, default=1)
    status = Column(String(20), default="active") # active, staged, retired
    created_at = Column(DateTime, default=datetime.utcnow)


class UserAbeKey(Base):
    """User CP-ABE private key wrapped under KMS envelope encryption (Figure 11, Section 3.6.7, DD-09)."""
    __tablename__ = "user_abe_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="active") # active, revoked, retired
    wrapped_dek = Column(Text, nullable=True) # KMS-wrapped data key
    nonce = Column(String(64), nullable=True)
    key_ciphertext = Column(Text, nullable=False) # AES-GCM encrypted serialized private key
    kms_key_arn = Column(String(255), nullable=True)
    issued_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    material_deleted_at = Column(DateTime, nullable=True)

    user = relationship("User")
    attributes = relationship("UserKeyAttribute", back_populates="key", cascade="all, delete-orphan")


class UserKeyAttribute(Base):
    """Attributes bound to a UserAbeKey (Figure 11, p. 28, 33)."""
    __tablename__ = "user_key_attributes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_id = Column(String(36), ForeignKey("user_abe_keys.id"), nullable=False)
    token = Column(String(100), nullable=False, index=True)

    key = relationship("UserAbeKey", back_populates="attributes")


class ImportBatch(Base):
    """Batch of imported anonymized training data (Figure 12, Section 3.5.2, p. 29, 33)."""
    __tablename__ = "import_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_hash = Column(String(64), nullable=False)
    source_file_name = Column(String(255), nullable=False)
    record_count = Column(Integer, default=0)
    storage_path = Column(String(500), nullable=True) # Restricted storage location
    in_scope_count = Column(Integer, default=0) # >= August 1, 2026 cutoff
    pre_cutoff_count = Column(Integer, default=0) # < August 1, 2026 excluded
    quarantined_count = Column(Integer, default=0) # Duplicate rows quarantined
    distinct_customers_count = Column(Integer, default=0) # Distinct client organizations
    reconciled = Column(Boolean, default=False)
    loaded_at = Column(DateTime, default=datetime.utcnow)
    loaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)


class ImportStagingRow(Base):
    """Staged raw row during pilot-data preparation (Figure 12, p. 29, 33)."""
    __tablename__ = "import_staging_rows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("import_batches.id"), nullable=False)
    source_row_no = Column(Integer, nullable=False)
    raw_data = Column(JSON, default=dict)
    validation_status = Column(String(50), default="PENDING") # VALID, PRE_CUTOFF_EXCLUDED, QUARANTINED, RESOLVED, COMMITTED


class ImportDiscrepancy(Base):
    """Tracked data discrepancies in pilot data (Figure 12, Section 3.5.4, p. 29, 33)."""
    __tablename__ = "import_discrepancies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("import_batches.id"), nullable=False)
    source_row_no = Column(Integer, nullable=False)
    issue_type = Column(String(100), nullable=False)
    field_name = Column(String(100), nullable=True)
    resolution = Column(String(255), nullable=True) # ACCEPT, CORRECT, OVERRIDE_FLAG, MERGE_DUPLICATE
    resolution_reason = Column(Text, nullable=True) # Mandatory reason on Admin resolution
    resolved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)


class UserSession(Base):
    """Server-side session tracking for refresh tokens (SEC-01, TC-AUT-08)."""
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    refresh_token_hash = Column(String(64), index=True, nullable=False)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    
    # Role-based idle timeout & 12-hour maximum lifetime (SEC-07, OI-17)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    idle_timeout_sec = Column(Integer, default=900) # Default 15m (900s admin/fin, 1800s am/trn, 3600s trainee)
    max_expires_at = Column(DateTime, nullable=True) # 12-hour absolute maximum session lifetime
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    """Single-use, expiring activation or reset token (FR-02, SEC-01)."""
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), index=True, nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")




class ReencryptionJob(Base):
    """Background Re-encryption Job tracking entity for Tier-2 Revocation (DD-05, OI-16, Section 3.6.7)."""
    __tablename__ = "reencryption_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_code = Column(String(50), nullable=False)
    old_version = Column(Integer, nullable=False)
    new_version = Column(Integer, nullable=False)
    batch_size = Column(Integer, default=50) # Defined batching policy (OI-16)
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    status = Column(String(20), default="IN_PROGRESS") # IN_PROGRESS, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    initiated_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    initiated_by = relationship("User", foreign_keys=[initiated_by_user_id])
