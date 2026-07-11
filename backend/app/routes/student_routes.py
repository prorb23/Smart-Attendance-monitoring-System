import os
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.database import get_db
from app.models.models import User, Student
from app.schemas.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.auth.auth import get_admin_user, get_password_hash
from app.services.face_service import delete_student_images, DATASET_DIR

logger = logging.getLogger(__name__)
router = APIRouter()


def _face_image_count(student_id: str) -> int:
    folder = os.path.join(DATASET_DIR, student_id)
    if not os.path.isdir(folder):
        return 0
    return sum(1 for f in os.listdir(folder) if f.lower().endswith((".jpg", ".jpeg", ".png")))


@router.get("", response_model=List[StudentResponse])
async def list_students(
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    query = db.query(Student)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.name.ilike(term),
                Student.student_id.ilike(term),
                Student.roll_number.ilike(term),
            )
        )

    students = query.order_by(Student.name).all()
    return [
        StudentResponse(
            id=s.id,
            student_id=s.student_id,
            name=s.name,
            roll_number=s.roll_number,
            department=s.department,
            semester=s.semester,
            image_folder=s.image_folder,
            has_face_data=_face_image_count(s.student_id) > 0,
        )
        for s in students
    ]


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if db.query(Student).filter(Student.student_id == student_data.student_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student ID '{student_data.student_id}' is already registered",
        )
    if db.query(User).filter(User.username == student_data.student_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user account for '{student_data.student_id}' already exists",
        )

    user = User(
        username=student_data.student_id,
        password_hash=get_password_hash(student_data.password),
        role="student",
    )
    db.add(user)
    db.flush()

    student = Student(
        student_id=student_data.student_id,
        name=student_data.name,
        roll_number=student_data.roll_number,
        department=student_data.department,
        semester=student_data.semester,
        user_id=user.id,
        image_folder=os.path.join(DATASET_DIR, student_data.student_id),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    logger.info("Created student account: %s", student_data.student_id)

    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        name=student.name,
        roll_number=student.roll_number,
        department=student.department,
        semester=student.semester,
        image_folder=student.image_folder,
        has_face_data=False,
    )


@router.get("/{student_id}")
async def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    count = _face_image_count(student.student_id)
    return {
        "id": student.id,
        "student_id": student.student_id,
        "name": student.name,
        "roll_number": student.roll_number,
        "department": student.department,
        "semester": student.semester,
        "image_folder": student.image_folder,
        "has_face_data": count > 0,
        "face_image_count": count,
    }


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    update_data: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if update_data.name is not None:
        student.name = update_data.name
    if update_data.roll_number is not None:
        student.roll_number = update_data.roll_number
    if update_data.department is not None:
        student.department = update_data.department
    if update_data.semester is not None:
        student.semester = update_data.semester

    if update_data.password:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            user.password_hash = get_password_hash(update_data.password)

    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        name=student.name,
        roll_number=student.roll_number,
        department=student.department,
        semester=student.semester,
        image_folder=student.image_folder,
        has_face_data=_face_image_count(student.student_id) > 0,
    )


@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    delete_student_images(student_id)

    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        db.delete(user)
    db.commit()
    logger.info("Deleted student: %s", student_id)

    return {"message": f"Student '{student_id}' has been deleted"}
