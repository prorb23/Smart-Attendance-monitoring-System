import logging
from datetime import date, datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database.database import get_db
from app.models.models import User, Student, Attendance
from app.schemas.schemas import (
    MarkAttendanceRequest, MarkAttendanceResponse,
    DashboardStats, StudentDashboardStats,
)
from app.auth.auth import get_current_user, get_admin_user
from app.services.face_service import base64_to_image, recognize_face

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/mark", response_model=MarkAttendanceResponse)
async def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    img = base64_to_image(request.image)
    if img is None:
        return MarkAttendanceResponse(success=False, message="Could not decode image. Please try again.")

    try:
        student_id, confidence = recognize_face(img)
    except Exception:
        logger.exception("Face recognition error during mark_attendance.")
        return MarkAttendanceResponse(success=False, message="Face recognition failed. Please try again.")

    if student_id is None:
        return MarkAttendanceResponse(
            success=False,
            message="Face not recognised. Ensure the student is enrolled and the model is trained.",
        )

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return MarkAttendanceResponse(success=False, message="Recognised face has no matching student record.")

    today = date.today()
    existing = db.query(Attendance).filter(
        and_(Attendance.student_id == student_id, Attendance.attendance_date == today)
    ).first()

    if existing:
        return MarkAttendanceResponse(
            success=False,
            message=f"Attendance already recorded for {student.name} today.",
            student_name=student.name,
            student_id=student_id,
            confidence=confidence,
            already_marked=True,
        )

    now = datetime.now()
    db.add(Attendance(student_id=student_id, attendance_date=today, attendance_time=now.time()))
    db.commit()

    return MarkAttendanceResponse(
        success=True,
        message=f"Attendance marked for {student.name}.",
        student_name=student.name,
        student_id=student_id,
        confidence=confidence,
        timestamp=now.strftime("%Y-%m-%d %H:%M:%S"),
    )


@router.get("")
async def list_attendance(
    student_id: Optional[str] = Query(None, max_length=64),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Attendance).join(Student, Attendance.student_id == Student.student_id)

    if current_user.role == "student":
        own = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not own:
            return {"records": [], "total": 0, "page": page, "page_size": page_size}
        query = query.filter(Attendance.student_id == own.student_id)
    elif student_id:
        query = query.filter(Attendance.student_id == student_id)

    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Attendance.attendance_date >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Attendance.attendance_date <= ed)
        except ValueError:
            pass

    if month:
        query = query.filter(func.strftime("%Y-%m", Attendance.attendance_date) == month)

    total = query.count()
    records = (
        query.order_by(Attendance.attendance_date.desc(), Attendance.attendance_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Build lightweight result with student names in a single pass
    student_cache: dict[str, str] = {}
    result = []
    for r in records:
        if r.student_id not in student_cache:
            s = db.query(Student.name).filter(Student.student_id == r.student_id).scalar()
            student_cache[r.student_id] = s or "Unknown"
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": student_cache[r.student_id],
            "attendance_date": r.attendance_date.isoformat(),
            "attendance_time": r.attendance_time.strftime("%H:%M:%S"),
        })

    return {"records": result, "total": total, "page": page, "page_size": page_size}


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    total_students = db.query(Student).count()
    today = date.today()
    present_today = db.query(Attendance).filter(Attendance.attendance_date == today).count()
    absent_today = total_students - present_today
    pct = (present_today / total_students * 100) if total_students else 0.0
    return DashboardStats(
        total_students=total_students,
        present_today=present_today,
        absent_today=absent_today,
        attendance_percentage=round(pct, 1),
    )


@router.get("/trends")
async def get_attendance_trends(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    total_students = db.query(Student).count()
    today = date.today()
    return [
        {
            "date": (today - timedelta(days=i)).strftime("%b %d"),
            "count": (count := db.query(Attendance).filter(
                Attendance.attendance_date == today - timedelta(days=i)
            ).count()),
            "total": total_students,
            "percentage": round(count / total_students * 100, 1) if total_students else 0.0,
        }
        for i in range(days - 1, -1, -1)
    ]


@router.get("/monthly-trends")
async def get_monthly_trends(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    today = date.today()
    result = []
    for i in range(months - 1, -1, -1):
        month_date = today.replace(day=1) - timedelta(days=i * 30)
        month_str = month_date.strftime("%Y-%m")
        count = db.query(Attendance).filter(
            func.strftime("%Y-%m", Attendance.attendance_date) == month_str
        ).count()
        result.append({"month": month_date.strftime("%b %Y"), "count": count})
    return result


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        own = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not own or own.student_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    records = (
        db.query(Attendance)
        .filter(Attendance.student_id == student_id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )

    return {
        "student": {
            "student_id": student.student_id,
            "name": student.name,
            "department": student.department,
            "semester": student.semester,
        },
        "records": [
            {"id": r.id, "date": r.attendance_date.isoformat(), "time": r.attendance_time.strftime("%H:%M:%S"), "status": "Present"}
            for r in records
        ],
        "total_attended": len(records),
    }


@router.get("/student-stats/{student_id}", response_model=StudentDashboardStats)
async def get_student_stats(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        own = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not own or own.student_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    total_days = db.query(func.count(func.distinct(Attendance.attendance_date))).scalar() or 0
    attended = db.query(Attendance).filter(Attendance.student_id == student_id).count()
    pct = (attended / total_days * 100) if total_days else 0.0

    return StudentDashboardStats(
        total_classes=total_days,
        classes_attended=attended,
        attendance_percentage=round(pct, 1),
        present_days=attended,
    )
