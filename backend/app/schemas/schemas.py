from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, ConfigDict


# Auth & Token
class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    role: Optional[str] = None
    user_id: Optional[str] = None
    full_name: Optional[str] = None
    assigned_client_accounts: List[str] = []
    clearance_level: Optional[int] = None
    mfa_required: bool = False
    challenge_token: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None

# MFA Schemas (SEC-01, OI-26)
class MFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_code_data_uri: str

class MFAEnableRequest(BaseModel):
    secret: str
    code: str

class MFAEnableResponse(BaseModel):
    message: str
    recovery_codes: List[str]

class MFAVerifyRequest(BaseModel):
    challenge_token: str
    code: str # 6-digit TOTP code or 8-character recovery code


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str # admin, account_manager, finance, trainer, trainee
    job_title: Optional[str] = None
    assigned_client_accounts: List[str] = []
    clearance_level: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserCreateAdmin(UserBase):
    temporary_password: Optional[str] = None

class UserActivationResponse(BaseModel):
    user: "UserResponse"
    activation_token: str
    activation_link: str
    expires_at: datetime

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    force_password_change: Optional[bool] = False
    mfa_enabled: Optional[bool] = False
    created_at: Optional[datetime] = None
    streak: Optional[int] = None
    company_name: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class UserAttributeUpdate(BaseModel):
    role: Optional[str] = None
    assigned_client_accounts: Optional[List[str]] = None
    clearance_level: Optional[int] = None



# Client Company
class ClientCompanyBase(BaseModel):
    code: str
    name: str
    client_type: str = "COMPANY" # COMPANY or INDIVIDUAL (FR-05)
    industry: Optional[str] = None

class ClientCompanyCreate(ClientCompanyBase):
    pass

class ClientCompanyResponse(ClientCompanyBase):
    id: str
    created_at: datetime
    streak: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# Trainee
class TraineeBase(BaseModel):
    trainee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    display_name: Optional[str] = None
    phone: Optional[str] = None
    current_company_id: Optional[str] = None

class TraineeCreate(TraineeBase):
    pass

class TraineeResponse(TraineeBase):
    id: str
    created_at: datetime
    current_company: Optional[ClientCompanyResponse] = None

    model_config = ConfigDict(from_attributes=True)

class TraineeProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None


# Training Record
class TrainingRecordCreate(BaseModel):
    trainee_id: str
    session_id: Optional[str] = None
    company_at_completion_id: str
    course_name: str
    status: str = "In progress" # In progress, Completed, Not completed
    score: Optional[float] = None
    # Sensitive attributes for hybrid CP-ABE payload
    assessment_notes: Optional[str] = None
    practical_lab: Optional[str] = None
    certificate_reference: Optional[str] = None
    extension_fields: Optional[Dict[str, Any]] = None

class TrainingRecordUpdate(BaseModel):
    status: Optional[str] = None # In progress, Completed, Not completed
    attendance_status: Optional[str] = None # Present, Absent, Excused
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    assessment_notes: Optional[str] = None
    reason: Optional[str] = None # Required for Admin and Finance edits

class TrainingRecordResponse(BaseModel):
    id: str
    trainee_id: str
    trainee_name: Optional[str] = None
    trainee_email: Optional[str] = None
    trainee_code: Optional[str] = None
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    session_id: Optional[str] = None
    company_at_completion_id: str
    course_name: str
    status: str
    attendance_status: Optional[str] = None
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    encryption_policy: str
    policy_version: Optional[int] = 1
    is_encrypted: Optional[bool] = True
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    created_at: Optional[datetime] = None
    streak: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class DecryptedRecordResponse(BaseModel):
    record_id: str
    course_name: str
    status: str
    trainee_name: Optional[str] = None
    trainee_email: Optional[str] = None
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    score: Optional[float] = None
    completion_date: Optional[datetime] = None
    decrypted_content: Dict[str, Any]
    decryption_status: str

class SystemOverviewResponse(BaseModel):
    users_total: int
    users_active_now: int
    clients_total: int
    records_total: int
    anomalies_24h: int
    policies_enforced: int
    system_status: str
    role_distribution: Dict[str, int]

class QuizListItem(BaseModel):
    id: str
    title: str
    session_id: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    instructor_name: Optional[str] = None
    category: Optional[str] = None
    header_color: Optional[str] = None
    version_no: int
    is_closed: bool
    is_approved: Optional[bool] = False
    approved_at: Optional[datetime] = None
    questions_count: int
    completed: Optional[bool] = False
    score: Optional[float] = None
    created_at: datetime

class QuizCreate(BaseModel):
    title: str
    session_id: Optional[str] = None

class QuizQuestionCreate(BaseModel):
    question_text: str
    options: List[str]
    correct_option: int = 0
    points: int = 10
    explanation: Optional[str] = None


# Certification
class CertificationTypeResponse(BaseModel):
    code: str
    name: str
    validity_months: int
    validity_basis: str

    model_config = ConfigDict(from_attributes=True)

class CertificateResponse(BaseModel):
    id: str
    trainee_id: str
    record_id: Optional[str] = None
    cert_type_code: Optional[str] = None
    title: str
    serial_number: Optional[str] = None
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    expiry_basis: str
    status: str # Valid, Expiring soon, Expired
    is_nearing_renewal: bool
    reissue_count: int = 0
    is_self_reported: bool = False
    credential_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: str
    recipient_user_id: str
    certification_id: str
    offset_days: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    streak: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# Gamification
class GamificationResponse(BaseModel):
    id: str
    trainee_id: str
    points: int
    level: int
    badges: List[str]
    quizzes_completed: int
    streak: Optional[int] = 0
    current_streak: Optional[int] = 0
    last_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class QuizSubmitRequest(BaseModel):
    attempt_id: Optional[str] = None # Client-generated UUID for idempotency
    trainee_id: str
    quiz_id: str
    answers: Optional[Dict[str, int]] = None
    score: Optional[float] = None
    total_questions: Optional[int] = None
    submitted_offline: bool = False

class LeaderboardOptOutRequest(BaseModel):
    opt_out: bool

class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    points: int
    level: int
    streak: Optional[int] = 0
    badges_count: int
    quizzes_completed: int

class QuizQuestionTraineeView(BaseModel):
    id: str
    quiz_id: str
    question_text: str
    options: List[str]
    points: int

    model_config = ConfigDict(from_attributes=True)


class QuizQuestionStaffView(QuizQuestionTraineeView):
    """Trainer/Admin authoring view. correct_answer/explanation stay None for trainees (SEC-26)."""
    correct_answer: Optional[int] = None
    explanation: Optional[str] = None

class QuizQuestionReview(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    selected_option: Optional[int] = None
    correct_answer: Optional[int] = None
    is_correct: bool
    explanation: Optional[str] = None
    points_earned: int

class QuizSubmissionResult(BaseModel):
    attempt_id: str
    quiz_id: str
    trainee_id: str
    score: float
    total_points: int
    passed: bool
    is_closed: bool
    review_available: bool # True only if quiz is closed (SEC-26)
    questions_review: Optional[List[QuizQuestionReview]] = None
    gamification: GamificationResponse


# Anomalies & Audit (with full alert lifecycle)
class AnomalyAlertReviewRequest(BaseModel):
    status: str # UNDER_REVIEW, AWAITING_UNINVOLVED_ADMIN, or CLOSED (OI-30)
    disposition: Optional[str] = None # CLOSED_EXPECTED_ACTIVITY or CLOSED_FOLLOW_UP_REQUIRED
    review_note: Optional[str] = None
    involved_admin_ids: Optional[List[str]] = None

class AnomalyAlertResponse(BaseModel):
    id: str
    subject_user_id: Optional[str] = None
    rule_code: str
    severity: str
    severity_base: Optional[str] = "MEDIUM"
    severity_final: Optional[str] = "MEDIUM"
    after_hours_tag: Optional[bool] = False
    episode_start: Optional[datetime] = None
    client_reviewed: Optional[bool] = False
    status: str # NEW, UNDER_REVIEW, CLOSED
    disposition: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_by_user_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    tags: List[str] = []
    event_count: int
    description: str
    metadata_info: Dict[str, Any]
    created_at: datetime
    streak: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class AccessLogResponse(BaseModel):
    id: str
    occurred_at: datetime
    actor_user_id: Optional[str] = None
    actor_role: Optional[str] = None
    event_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    company_id: Optional[str] = None
    outcome: str
    reason_code: Optional[str] = None
    source_ip: Optional[str] = None
    details: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class AnomalyRuleResponse(BaseModel):
    id: str
    rule_code: str
    parameters: Dict[str, Any]
    version_no: int
    client_reviewed: bool
    last_edited_by_user_id: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RuleApproveRequest(BaseModel):
    reason: Optional[str] = None


class AnomalyRuleUpdate(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    client_reviewed: Optional[bool] = None
    description: Optional[str] = None
    reason: Optional[str] = None


class AnomalyRuleBatchItem(BaseModel):
    rule_code: str
    parameters: Dict[str, Any]


class AnomalyRuleBatchRequest(BaseModel):
    rules: List[AnomalyRuleBatchItem]
    reason: str


class RetentionJobRequest(BaseModel):
    retention_days: Optional[int] = 365
    warning_days: Optional[int] = 30


class RetentionWarningItem(BaseModel):
    alert_id: str
    rule_code: str
    severity: Optional[str] = "MEDIUM"
    status: str
    created_at: str
    age_days: int
    days_until_retention_limit: int
    warning: str


class RetentionJobResponse(BaseModel):
    success: bool
    purged_logs_count: int
    purged_closed_alerts_count: int
    open_alerts_warned_count: int
    warnings: List[RetentionWarningItem] = []
    purge_cutoff: str
    warning_cutoff: str



class CertificateReissueRequest(BaseModel):
    reason: str


class ExternalRenewalRequest(BaseModel):
    cert_type_code: str
    title: str
    credential_url: str
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None


class ParticipantCompletionItem(BaseModel):
    record_id: str
    status: str # 'Completed' or 'Not completed'
    score: Optional[float] = None
    remarks: Optional[str] = None


class TrainerSignOffRequest(BaseModel):
    notes: Optional[str] = None
    completions: List[ParticipantCompletionItem] = []


class TrainerSignOffResponse(BaseModel):
    session_id: str
    session_code: str
    trainer_signed_off: bool
    trainer_sign_off_at: datetime
    certificates_issued: int
    participants_updated: int
    not_eligible_record_ids: List[str] = []


class DiscrepancyResolveRequest(BaseModel):
    resolution: str # ACCEPT, CORRECT, OVERRIDE_FLAG, MERGE_DUPLICATE
    reason: str # Mandatory explanation reason logged for Admin resolution
    corrected_data: Optional[Dict[str, Any]] = None


class CustomerBreakdownItem(BaseModel):
    customer_name: str
    row_count: int
    is_pseudonymized_individual: bool


class ReconciliationReportResponse(BaseModel):
    batch_id: str
    file_hash: str
    source_file_name: str
    loaded_at: datetime
    loaded_by_user_id: Optional[str] = None
    total_rows: int
    pre_cutoff_rows: int
    in_scope_rows: int
    distinct_customers: int
    individual_customers_pseudonymized: int
    quarantined_rows: int
    resolved_rows: int
    reconciliation_rate: str
    reconciled: bool
    customer_breakdown: List[Dict[str, Any]]
    discrepancies: List[Dict[str, Any]]


class ReencryptionTriggerRequest(BaseModel):
    company_code: str
    old_version: int
    new_version: int
    batch_size: Optional[int] = 50


class ReencryptionJobResponse(BaseModel):
    id: str
    company_code: str
    old_version: int
    new_version: int
    batch_size: int
    total_records: int
    processed_records: int
    progress_percent: float
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AttributeBumpRequest(BaseModel):
    attribute_type: str
    ref_code: str


class AttributeBumpResponse(BaseModel):
    attribute_type: str
    ref_code: str
    old_token: str
    new_token: str
    old_version: int
    new_version: int


# Training Session Management (FR-04, FR-05)
class TrainingSessionCreate(BaseModel):
    session_code: str
    course_id: Optional[str] = None
    course_name: str
    start_date: datetime
    end_date: datetime
    delivery_type: str = "Public" # Public, Dedicated
    delivery_mode: str = "F2F" # F2F, Online, Hybrid
    venue: Optional[str] = None
    trainer_name: Optional[str] = None

class TrainingSessionResponse(BaseModel):
    id: str
    session_code: str
    course_id: Optional[str] = None
    course_name: str
    start_date: datetime
    end_date: datetime
    delivery_type: str
    delivery_mode: Optional[str] = "F2F"
    venue: Optional[str] = None
    trainer_signed_off: bool
    trainer_sign_off_at: Optional[datetime] = None
    created_at: datetime
    assigned_trainers: List[Dict[str, Any]] = []
    participant_count: int = 0
    board_stage: Optional[str] = None
    client_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SessionEnrollRequest(BaseModel):
    trainee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    company_code: Optional[str] = None

class TrainerAssignmentCreate(BaseModel):
    user_id: str

class TrainerAssignmentResponse(BaseModel):
    id: str
    user_id: str
    session_id: str
    trainer_name: Optional[str] = None
    trainer_email: Optional[str] = None
    valid_from: datetime
    valid_to: Optional[datetime] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

# Trainee Company Affiliation (FR-15)
class TraineeCompanyChangeRequest(BaseModel):
    new_company_id: str
    effective_date: Optional[datetime] = None
    reason: Optional[str] = None

class TraineeAffiliationResponse(BaseModel):
    id: str
    trainee_id: str
    company_id: str
    company_name: Optional[str] = None
    company_code: Optional[str] = None
    valid_from: datetime
    valid_to: Optional[datetime] = None
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)

# Gamification Teams (GAM-03)
class TeamCreate(BaseModel):
    team_name: str

class TeamMemberAdd(BaseModel):
    trainee_id: str

class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    trainee_id: str
    trainee_name: Optional[str] = None
    trainee_code: Optional[str] = None
    display_name: Optional[str] = None
    points: int = 0

    model_config = ConfigDict(from_attributes=True)

class TeamResponse(BaseModel):
    id: str
    session_id: str
    team_name: str
    created_by_user_id: str
    created_at: datetime
    members_count: int = 0
    total_points: int = 0
    members: List[TeamMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
