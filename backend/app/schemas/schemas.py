from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import date, time


# ─── Authentication ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username must not be blank")
        return v

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, v: str) -> str:
        if not v:
            raise ValueError("Password must not be blank")
        return v


class LoginResponse(BaseModel):
    token: str
    role: str
    username: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        return v


# ─── Students ─────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    student_id: str
    name: str
    roll_number: str
    department: str
    semester: str
    password: str

    @field_validator("student_id", "name", "roll_number", "department", "semester")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class StudentResponse(BaseModel):
    id: int
    student_id: str
    name: str
    roll_number: str
    department: str
    semester: str
    image_folder: Optional[str] = None
    has_face_data: bool = False

    model_config = {"from_attributes": True}


# ─── Face Registration ────────────────────────────────────────────────────────

class FaceRegisterRequest(BaseModel):
    student_id: str
    images: List[str]  # Base64-encoded JPEG frames


class FaceRegisterResponse(BaseModel):
    success: bool
    message: str
    images_saved: int = 0


class TrainResponse(BaseModel):
    success: bool
    message: str
    students_processed: int = 0
    total_encodings: int = 0


# ─── Attendance ───────────────────────────────────────────────────────────────

class MarkAttendanceRequest(BaseModel):
    image: str  # Base64-encoded JPEG frame


class AttendanceResponse(BaseModel):
    id: int
    student_id: str
    student_name: str = ""
    attendance_date: date
    attendance_time: time

    model_config = {"from_attributes": True}


class MarkAttendanceResponse(BaseModel):
    success: bool
    message: str
    student_name: Optional[str] = None
    student_id: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: Optional[str] = None
    already_marked: bool = False


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    attendance_percentage: float


class AttendanceTrend(BaseModel):
    date: str
    count: int
    total: int
    percentage: float


class StudentDashboardStats(BaseModel):
    total_classes: int
    classes_attended: int
    attendance_percentage: float
    present_days: int
