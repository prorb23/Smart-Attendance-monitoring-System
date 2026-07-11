import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User, Student
from app.schemas.schemas import LoginRequest, LoginResponse, ChangePasswordRequest
from app.auth.auth import verify_password, create_access_token, get_current_user, get_password_hash

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()

    # Constant-time-safe: always call verify_password even on missing user to avoid timing attacks
    dummy_hash = "$2b$12$notarealhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    if not user or not verify_password(request.password, user.password_hash if user else dummy_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return LoginResponse(token=token, role=user.role, username=user.username)


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
    }

    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            payload["student"] = {
                "id": student.id,
                "student_id": student.student_id,
                "name": student.name,
                "roll_number": student.roll_number,
                "department": student.department,
                "semester": student.semester,
            }

    return payload


@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    logger.info("Password changed for user: %s", current_user.username)
    return {"message": "Password updated successfully"}
