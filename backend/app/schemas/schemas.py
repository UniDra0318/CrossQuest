from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr


# Auth & Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    clearance_level: int = 1
    assigned_client_accounts: List[str] = []

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserAttributeUpdate(BaseModel):
    role: Optional[str] = None
    clearance_level: Optional[int] = None
    assigned_client_accounts: Optional[List[str]] = None


# Client Company
class ClientCompanyBase(BaseModel):
    code: str
    name: str
    industry: Optional[str] = None

class ClientCompanyCreate(ClientCompanyBase):
    pass

class ClientCompanyResponse(ClientCompanyBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Trainee
class TraineeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    current_company_id: Optional[str] = None

class TraineeCreate(TraineeBase):
    pass

class TraineeResponse(TraineeBase):
    id: str
    created_at: datetime
    current_company: Optional[ClientCompanyResponse] = None

    class Config:
        from_attributes = True


# Training Record
class TrainingRecordCreate(BaseModel):
    trainee_id: str
    company_at_completion_id: str
    course_name: str
    status: str = "in_progress"
    score: Optional[float] = None
    # CP-ABE policy attributes to bind: e.g. "ROLE:ACCOUNT_MANAGER AND COMPANY:CORP_A"
    required_role: str
    required_company: str
    required_clearance: int = 1

class TrainingRecordResponse(BaseModel):
    id: str
    trainee_id: str
    course_name: str
    status: str
    score: Optional[float] = None
    encryption_policy: str
    is_encrypted: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DecryptedRecordResponse(BaseModel):
    record_id: str
    course_name: str
    status: str
    score: Optional[float] = None
    decrypted_content: Dict[str, Any]
    decryption_status: str


# Certificate
class CertificateResponse(BaseModel):
    id: str
    trainee_id: str
    title: str
    issue_date: datetime
    expiry_date: datetime
    is_nearing_renewal: bool
    status: str

    class Config:
        from_attributes = True


# Gamification
class GamificationResponse(BaseModel):
    id: str
    trainee_id: str
    points: int
    level: int
    badges: List[str]
    quizzes_completed: int

    class Config:
        from_attributes = True

class QuizSubmitRequest(BaseModel):
    trainee_id: str
    quiz_id: str
    score: float
    total_questions: int


# Anomalies & Audit
class AnomalyAlertResponse(BaseModel):
    id: str
    user_id: str
    anomaly_type: str
    severity: str
    description: str
    metadata_info: Dict[str, Any]
    is_reviewed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AccessLogResponse(BaseModel):
    id: str
    user_id: str
    target_record_id: Optional[str] = None
    access_type: str
    timestamp: datetime
    status: str
    requested_company_code: Optional[str] = None

    class Config:
        from_attributes = True
