"""
SQLAlchemy ORM models for the attendance system.
"""
from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.database import Base


class User(Base):
    """Authentication table for both admins and students."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")  # "admin" or "student"

    # Relationship to student profile
    student = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Student(Base):
    """Student profile information."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    roll_number = Column(String, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_folder = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="student")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")


class Attendance(Base):
    """Attendance records with one entry per student per day."""
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    attendance_time = Column(Time, nullable=False)

    # Unique constraint: one attendance per student per day
    __table_args__ = (
        UniqueConstraint("student_id", "attendance_date", name="uq_student_date"),
    )

    # Relationship
    student = relationship("Student", back_populates="attendance_records")
