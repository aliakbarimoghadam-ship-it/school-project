from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """User model representing teachers and students."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # 'teacher' or 'student'
    class_name = Column(String(50), nullable=True)  # Used for students, e.g., 'هفتم الف'
    subject = Column(String(50), nullable=True)  # Used for teachers, e.g., 'ریاضی'

    # Relationships
    student_grades = relationship(
        "Grade",
        foreign_keys="Grade.student_id",
        back_populates="student",
        cascade="all, delete-orphan"
    )
    teacher_grades = relationship(
        "Grade",
        foreign_keys="Grade.teacher_id",
        back_populates="teacher"
    )


class Grade(Base):
    """Grade model recording student evaluations across terms and subjects."""
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)  # 0.0 to 20.0 (Iranian grading scale)
    term = Column(String(50), nullable=False)  # e.g., 'نیمسال اول'
    comment = Column(String(255), nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    student = relationship("User", foreign_keys=[student_id], back_populates="student_grades")
    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="teacher_grades")

    @property
    def student_name(self) -> str:
        """Helper property to access the student's full name."""
        return self.student.full_name if self.student else ""

    @property
    def teacher_name(self) -> str:
        """Helper property to access the teacher's full name."""
        return self.teacher.full_name if self.teacher else ""
