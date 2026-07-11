import io
import logging
import re
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User, Student, Attendance
from app.auth.auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter()

_SAFE_FILENAME_RE = re.compile(r"[^\w\-.]")


def _build_report_df(db: Session, student_id: Optional[str], month: Optional[str]) -> pd.DataFrame:
    query = db.query(Attendance).join(Student, Attendance.student_id == Student.student_id)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if month:
        from sqlalchemy import func
        query = query.filter(func.strftime("%Y-%m", Attendance.attendance_date) == month)
    records = query.order_by(Attendance.attendance_date.desc(), Attendance.attendance_time.desc()).all()

    # Build a student name lookup to avoid an N+1 query
    student_ids = {r.student_id for r in records}
    name_map = {
        s.student_id: s.name
        for s in db.query(Student).filter(Student.student_id.in_(student_ids)).all()
    } if student_ids else {}

    rows = [
        {
            "Student ID": r.student_id,
            "Student Name": name_map.get(r.student_id, "Unknown"),
            "Date": r.attendance_date.strftime("%Y-%m-%d"),
            "Time": r.attendance_time.strftime("%H:%M:%S"),
        }
        for r in records
    ]
    return pd.DataFrame(rows) if rows else pd.DataFrame(columns=["Student ID", "Student Name", "Date", "Time"])


def _safe_filename(base: str) -> str:
    return _SAFE_FILENAME_RE.sub("_", base)


@router.get("/export/excel")
async def export_excel(
    student_id: Optional[str] = Query(None, max_length=64),
    month: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    df = _build_report_df(db, student_id, month)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Attendance")
        ws = writer.sheets["Attendance"]
        for idx, col in enumerate(df.columns):
            width = max(df[col].astype(str).map(len).max() if len(df) else 0, len(col)) + 2
            ws.column_dimensions[chr(65 + idx)].width = width
    buf.seek(0)

    filename = _safe_filename(f"attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/csv")
async def export_csv(
    student_id: Optional[str] = Query(None, max_length=64),
    month: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    df = _build_report_df(db, student_id, month)

    csv_bytes = df.to_csv(index=False).encode()
    filename = _safe_filename(f"attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
