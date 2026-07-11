import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User, Student
from app.schemas.schemas import FaceRegisterRequest, FaceRegisterResponse, TrainResponse
from app.auth.auth import get_admin_user
from app.services.face_service import (
    base64_to_image,
    detect_face,
    check_blur,
    get_face_encoding,
    check_duplicate_face,
    save_face_images,
    train_encodings,
    get_all_encodings_by_student,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=FaceRegisterResponse)
async def register_face(
    request: FaceRegisterRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    student = db.query(Student).filter(Student.student_id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if not request.images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No images provided")

    # Duplicate-face check against all existing registered students
    existing = get_all_encodings_by_student()
    if existing:
        for img_b64 in request.images[:3]:
            try:
                img = base64_to_image(img_b64)
                if img is None:
                    continue
                enc = get_face_encoding(img)
                if enc is None:
                    continue
                conflict = check_duplicate_face(enc, existing, exclude_student_id=request.student_id)
                if conflict:
                    return FaceRegisterResponse(
                        success=False,
                        message="This face is already registered under a different student account.",
                        images_saved=0,
                    )
                break
            except Exception:
                logger.debug("Duplicate check skipped for one image", exc_info=True)

    saved_count, folder_path = save_face_images(request.student_id, request.images)

    student.image_folder = folder_path
    db.commit()

    if saved_count == 0:
        return FaceRegisterResponse(
            success=False,
            message="No valid face images were saved. Ensure the face is clearly visible and the image is in focus.",
            images_saved=0,
        )

    # Retrain immediately so subsequent registrations have up-to-date encodings
    try:
        train_encodings()
    except Exception:
        logger.warning("Auto-training failed after face registration for %s", request.student_id, exc_info=True)

    return FaceRegisterResponse(
        success=True,
        message=f"Registered {saved_count} face images for {student.name}.",
        images_saved=saved_count,
    )


@router.post("/train", response_model=TrainResponse)
async def train_face_database(_: User = Depends(get_admin_user)):
    try:
        students_processed, total_encodings = train_encodings()
    except Exception:
        logger.exception("Face database training failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Training failed. Check server logs for details.",
        )

    if students_processed == 0:
        return TrainResponse(
            success=False,
            message="No face images found. Register face data for students before training.",
            students_processed=0,
            total_encodings=0,
        )

    return TrainResponse(
        success=True,
        message=f"Training complete — {students_processed} students, {total_encodings} encodings.",
        students_processed=students_processed,
        total_encodings=total_encodings,
    )
