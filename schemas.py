from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ==========================================
# Authentication & User Schemas
# ==========================================

class LoginRequest(BaseModel):
    """Payload required for user login."""
    username: str = Field(..., description="Unique user identification name")
    password: str = Field(..., description="Plaintext password")


class TokenResponse(BaseModel):
    """Authentication token response with basic user context."""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    id: Optional[int] = None
    username: str
    full_name: str
    role: str
    class_name: Optional[str] = None
    subject: Optional[str] = None


class UserOut(BaseModel):
    """Public user profile representation (never exposes password_hash)."""
    id: int
    username: str
    full_name: str
    role: str
    class_name: Optional[str] = None
    subject: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentListItem(BaseModel):
    """Student overview item for teacher's student roster."""
    id: int
    username: str
    full_name: str
    role: str = "student"
    class_name: Optional[str] = None
    average_score: Optional[float] = None
    total_grades: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Grade Schemas
# ==========================================

class GradeCreate(BaseModel):
    """Data required by a teacher to assign a new grade."""
    student_id: int
    subject: str = Field(..., min_length=1, max_length=50)
    score: float = Field(
        ...,
        ge=0.0,
        le=20.0,
        description="Iranian grade scale from 0.0 to 20.0"
    )
    term: str = Field(..., min_length=1, max_length=50, description="e.g. نیمسال اول")
    comment: Optional[str] = Field(None, max_length=255)


class GradeUpdate(BaseModel):
    """Data allowed for updating an existing grade."""
    score: Optional[float] = Field(None, ge=0.0, le=20.0)
    subject: Optional[str] = Field(None, min_length=1, max_length=50)
    term: Optional[str] = Field(None, min_length=1, max_length=50)
    comment: Optional[str] = Field(None, max_length=255)


class GradeOut(BaseModel):
    """Output model for a grade, including teacher and student names."""
    id: int
    student_id: int
    teacher_id: int
    student_name: Optional[str] = None
    teacher_name: Optional[str] = None
    subject: str
    score: float
    term: str
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def resolve_associated_names(cls, data: Any) -> Any:
        """Resolve student_name and teacher_name from ORM attributes or relationships."""
        if hasattr(data, "__dict__") or not isinstance(data, dict):
            student = getattr(data, "student", None)
            teacher = getattr(data, "teacher", None)

            student_name = getattr(data, "student_name", None) or (student.full_name if student else None)
            teacher_name = getattr(data, "teacher_name", None) or (teacher.full_name if teacher else None)

            return {
                "id": getattr(data, "id", None),
                "student_id": getattr(data, "student_id", None),
                "teacher_id": getattr(data, "teacher_id", None),
                "student_name": student_name,
                "teacher_name": teacher_name,
                "subject": getattr(data, "subject", None),
                "score": getattr(data, "score", None),
                "term": getattr(data, "term", None),
                "comment": getattr(data, "comment", None),
                "created_at": getattr(data, "created_at", None),
            }
        return data


# ==========================================
# Student Performance & Portal Schemas
# ==========================================

class StudentSummary(BaseModel):
    """Summary of student grades and academic performance."""
    student: UserOut
    class_name: Optional[str] = None
    grades: List[GradeOut] = Field(default_factory=list)
    average_score: Optional[float] = Field(
        None,
        description="Calculated average score rounded to two decimal places"
    )
    total_grades: int = 0


class StudentGradesResponse(BaseModel):
    """Response containing own grades list and subject groupings for student."""
    grades: List[GradeOut] = Field(default_factory=list)
    average_score: Optional[float] = None
    total_grades: int = 0
    by_subject: Dict[str, List[GradeOut]] = Field(default_factory=dict)


class StudentProfileResponse(BaseModel):
    """Student profile summary with key performance indicators."""
    id: int
    username: str
    full_name: str
    role: str = "student"
    class_name: Optional[str] = None
    total_grades: int = 0
    average_score: Optional[float] = None
    best_subject: Optional[str] = None
    lowest_subject: Optional[str] = None
    best_score: Optional[float] = None
    lowest_score: Optional[float] = None


# ==========================================
# School Info & Public Schemas
# ==========================================

class SchoolNewsItem(BaseModel):
    """News item model for public school announcements."""
    id: int
    title: str
    date: str
    text: str


class SchoolInfoResponse(BaseModel):
    """Public information about Shohada-ye Haste'i School."""
    school_name: str
    address: str
    phone: str
    email: str
    about: str
    news: List[SchoolNewsItem] = Field(default_factory=list)
