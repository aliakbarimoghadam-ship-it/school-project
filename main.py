import os
import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional, Dict

# Ensure correct MIME type for PWA webmanifest
mimetypes.add_type("application/manifest+json", ".webmanifest")

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import get_db
from models import User, Grade
from schemas import (
    LoginRequest,
    TokenResponse,
    UserOut,
    StudentListItem,
    GradeCreate,
    GradeUpdate,
    GradeOut,
    StudentGradesResponse,
    StudentProfileResponse,
    SchoolInfoResponse,
    SchoolNewsItem,
)
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)
from seed import seed_database


# ==========================================
# Application Lifespan & Initialization
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is created and seeded with sample data on startup."""
    seed_database()
    yield


app = FastAPI(
    title="سامانه مدرسه شهدای هسته‌ای",
    description="School Management Portal API - Shohada-ye Haste'i",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development and cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    """Disable caching for frontend static assets during development to avoid stale scripts."""
    response = await call_next(request)
    path = request.url.path
    if path.endswith((".js", ".css", ".html", ".webmanifest")) or path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ==========================================
# Public Endpoints
# ==========================================

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service operational status."""
    return {
        "status": "ok",
        "school": "شهدای هسته‌ای",
        "message": "Backend service is operational."
    }


@app.post(
    "/api/login",
    response_model=TokenResponse,
    tags=["Authentication"],
    summary="User Login"
)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password, returning a JWT bearer token."""
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نام کاربری یا رمز عبور اشتباه است",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issue access token with encoded claims
    token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        class_name=user.class_name,
        subject=user.subject,
    )


@app.get(
    "/api/school-info",
    response_model=SchoolInfoResponse,
    tags=["Public Info"],
    summary="General School Information"
)
def get_school_info():
    """Return public demo/sample information and announcements for Shohada-ye Haste'i School."""
    return SchoolInfoResponse(
        school_name="شهدای هسته‌ای",
        address="تهران، میدان انقلاب، خیابان کارگر شمالی، کوچه دانش، پلاک ۱۸ (آدرس نمونه)",
        phone="۰۲۱-۶۶۴۰۱۱۱۱ (شماره تماس نمونه)",
        email="info@shohada-hasteei.demo.ir",
        about=(
            "دبیرستان شهدای هسته‌ای با تکیه بر آموزش نوین، کادر آموزشی مجرب و امکانات آزمایشگاهی "
            "و پژوهشی پیشرفته، محیطی پویا و باانگیزه را برای شکوفایی استعدادهای علمی و اخلاقی "
            "دانش‌آموزان فراهم نموده است (کلیه داده‌های این سامانه آزمایشی و نمونه می‌باشند)."
        ),
        news=[
            SchoolNewsItem(
                id=1,
                title="برگزاری المپیاد علمی و مسابقات آزمایشگاهی",
                date="۱۴۰۳/۰۸/۱۵",
                text="مرحله اول آزمون‌های علمی و آزمایشگاهی در دروس ریاضی و علوم با حضور پرشور دانش‌آموزان پایه‌های هفتم برگزار گردید."
            ),
            SchoolNewsItem(
                id=2,
                title="ثبت نمرات مستمر نیمسال اول در سامانه",
                date="۱۴۰۳/۰۸/۲۰",
                text="اولیا و دانش‌آموزان گرامی می‌توانند با ورود به پنل کاربری خود، نمرات ارزشیابی مستمر دروس را مشاهده فرمایند."
            ),
            SchoolNewsItem(
                id=3,
                title="جلسه هم‌اندیشی اولیا و دبیران",
                date="۱۴۰۳/۰۸/۲۸",
                text="نشست صمیمانه بررسی روند تحصیلی و تربیتی دانش‌آموزان روز پنجشنبه در سالن اجتماعات دبیرستان تشکیل خواهد شد."
            ),
        ]
    )


# ==========================================
# Authenticated User Endpoints (Any Role)
# ==========================================

@app.get(
    "/api/me",
    response_model=UserOut,
    tags=["User Profile"],
    summary="Current User Profile"
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return profile details of the currently authenticated user."""
    return current_user


# ==========================================
# Admin Portal Endpoints
# ==========================================

@app.get(
    "/api/admin/stats",
    tags=["Admin Portal"],
    summary="School Overall Statistics"
)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Retrieve aggregate school metrics including users, grades count, and overall average score."""
    total_students = db.query(User).filter(User.role == "student").count()
    total_teachers = db.query(User).filter(User.role == "teacher").count()
    total_grades = db.query(Grade).count()

    all_scores = [g[0] for g in db.query(Grade.score).all()]
    overall_avg = round(sum(all_scores) / len(all_scores), 2) if all_scores else None

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_grades": total_grades,
        "overall_average": overall_avg,
    }


@app.get(
    "/api/admin/users",
    response_model=List[UserOut],
    tags=["Admin Portal"],
    summary="List All Users with Role Filter"
)
def list_all_users(
    role: Optional[str] = Query(None, description="Optional role filter: admin, teacher, student"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
):
    """Retrieve registered users in the school with optional role filtering."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.role, User.full_name).all()


# ==========================================
# Teacher-Only Endpoints
# ==========================================

@app.get(
    "/api/students",
    response_model=List[StudentListItem],
    tags=["Teacher Portal"],
    summary="List Students with Average Scores"
)
def list_students(
    class_name: Optional[str] = Query(None, description="Optional class filter e.g. هفتم الف"),
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Retrieve students with optional class filter and calculate each student's average grade."""
    query = db.query(User).filter(User.role == "student")
    if class_name:
        query = query.filter(User.class_name == class_name)

    students = query.order_by(User.full_name).all()
    results = []
    for student in students:
        grades = student.student_grades
        avg_score = (
            round(sum(g.score for g in grades) / len(grades), 2)
            if grades
            else None
        )
        results.append(
            StudentListItem(
                id=student.id,
                username=student.username,
                full_name=student.full_name,
                role=student.role,
                class_name=student.class_name,
                average_score=avg_score,
                total_grades=len(grades),
            )
        )
    return results


@app.get(
    "/api/students/{student_id}/grades",
    response_model=List[GradeOut],
    tags=["Teacher Portal"],
    summary="Get Student Grades"
)
def get_student_grades(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Retrieve all grade records for a specific student."""
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="دانش‌آموز مورد نظر یافت نشد"
        )

    grades = (
        db.query(Grade)
        .filter(Grade.student_id == student_id)
        .order_by(Grade.created_at.desc())
        .all()
    )
    return grades


@app.post(
    "/api/grades",
    response_model=GradeOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Teacher Portal"],
    summary="Create Grade"
)
def create_grade(
    grade_in: GradeCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Create a new grade entry for a student by the current teacher."""
    if not (0.0 <= grade_in.score <= 20.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="نمره باید عددی بین ۰ تا ۲۰ باشد"
        )

    student = db.query(User).filter(User.id == grade_in.student_id, User.role == "student").first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="دانش‌آموز مورد نظر یافت نشد یا شناسه متعلق به دانش‌آموز نیست"
        )

    new_grade = Grade(
        student_id=grade_in.student_id,
        teacher_id=current_teacher.id,
        subject=grade_in.subject,
        score=grade_in.score,
        term=grade_in.term,
        comment=grade_in.comment,
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade


@app.put(
    "/api/grades/{grade_id}",
    response_model=GradeOut,
    tags=["Teacher Portal"],
    summary="Update Grade"
)
def update_grade(
    grade_id: int,
    grade_in: GradeUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Update an existing grade. Teachers can edit grades for their own subject."""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="نمره مورد نظر یافت نشد"
        )

    teacher_subject = (current_teacher.subject or "").strip()
    grade_subject = (grade.subject or "").strip()
    is_owner = grade.teacher_id == current_teacher.id
    is_same_subject = teacher_subject and grade_subject and teacher_subject == grade_subject

    if not is_owner and not is_same_subject:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="شما تنها مجاز به ویرایش نمرات مربوط به درس خود هستید"
        )

    if grade_in.score is not None:
        if not (0.0 <= grade_in.score <= 20.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="نمره باید عددی بین ۰ تا ۲۰ باشد"
            )
        grade.score = grade_in.score

    if grade_in.subject is not None:
        grade.subject = grade_in.subject
    if grade_in.term is not None:
        grade.term = grade_in.term
    if grade_in.comment is not None:
        grade.comment = grade_in.comment

    db.commit()
    db.refresh(grade)
    return grade


@app.delete(
    "/api/grades/{grade_id}",
    tags=["Teacher Portal"],
    summary="Delete Grade"
)
def delete_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Delete an existing grade. Teachers can delete grades for their own subject."""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="نمره مورد نظر یافت نشد"
        )

    teacher_subject = (current_teacher.subject or "").strip()
    grade_subject = (grade.subject or "").strip()
    is_owner = grade.teacher_id == current_teacher.id
    is_same_subject = teacher_subject and grade_subject and teacher_subject == grade_subject

    if not is_owner and not is_same_subject:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="شما تنها مجاز به حذف نمرات مربوط به درس خود هستید"
        )

    db.delete(grade)
    db.commit()
    return {
        "message": "نمره با موفقیت حذف شد",
        "grade_id": grade_id
    }


@app.get(
    "/api/classes",
    response_model=List[str],
    tags=["Teacher Portal"],
    summary="List Classes"
)
def get_classes(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_role("teacher")),
):
    """Retrieve distinct class names available for students in the school."""
    classes = (
        db.query(User.class_name)
        .filter(User.role == "student", User.class_name.isnot(None))
        .distinct()
        .all()
    )
    return [c[0] for c in classes if c[0]]


# ==========================================
# Student-Only Endpoints
# ==========================================

@app.get(
    "/api/my-grades",
    response_model=StudentGradesResponse,
    tags=["Student Portal"],
    summary="View Own Grades"
)
def get_my_grades(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student")),
):
    """Retrieve the current student's grades, overall average, and subject-grouped records."""
    grades = (
        db.query(Grade)
        .filter(Grade.student_id == current_student.id)
        .order_by(Grade.created_at.desc())
        .all()
    )

    grades_out = [GradeOut.model_validate(g) for g in grades]
    avg_score = (
        round(sum(g.score for g in grades) / len(grades), 2)
        if grades
        else None
    )

    by_subject: Dict[str, List[GradeOut]] = {}
    for g_out in grades_out:
        by_subject.setdefault(g_out.subject, []).append(g_out)

    return StudentGradesResponse(
        grades=grades_out,
        average_score=avg_score,
        total_grades=len(grades),
        by_subject=by_subject,
    )


@app.get(
    "/api/my-profile",
    response_model=StudentProfileResponse,
    tags=["Student Portal"],
    summary="Student Profile & Stats"
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_role("student")),
):
    """Retrieve the current student's profile and summary stats (best/lowest subjects and average)."""
    grades = (
        db.query(Grade)
        .filter(Grade.student_id == current_student.id)
        .all()
    )

    total_grades = len(grades)
    avg_score = (
        round(sum(g.score for g in grades) / len(grades), 2)
        if grades
        else None
    )

    best_subject = None
    lowest_subject = None
    best_score = None
    lowest_score = None

    if grades:
        subject_scores: Dict[str, List[float]] = {}
        for g in grades:
            subject_scores.setdefault(g.subject, []).append(g.score)

        subject_averages = {
            subj: round(sum(scores) / len(scores), 2)
            for subj, scores in subject_scores.items()
        }

        if subject_averages:
            best_tuple = max(subject_averages.items(), key=lambda item: item[1])
            lowest_tuple = min(subject_averages.items(), key=lambda item: item[1])
            best_subject = best_tuple[0]
            best_score = best_tuple[1]
            lowest_subject = lowest_tuple[0]
            lowest_score = lowest_tuple[1]

    return StudentProfileResponse(
        id=current_student.id,
        username=current_student.username,
        full_name=current_student.full_name,
        role=current_student.role,
        class_name=current_student.class_name,
        total_grades=total_grades,
        average_score=avg_score,
        best_subject=best_subject,
        lowest_subject=lowest_subject,
        best_score=best_score,
        lowest_score=lowest_score,
    )


# ==========================================
# Static Files Serving (Frontend)
# ==========================================

# Dynamically locate the frontend directory whether main.py is in root or inside backend/
possible_frontend_dirs = [
    Path(__file__).resolve().parent / "frontend",          # If main.py is in repository root
    Path(__file__).resolve().parent.parent / "frontend",   # If main.py is inside backend/
    Path.cwd() / "frontend",                               # Current working directory
]

frontend_dir = next((p for p in possible_frontend_dirs if p.exists() and p.is_dir()), None)

if frontend_dir:
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    @app.get("/", tags=["Fallback"])
    def root_status():
        """Fallback message when frontend directory is not placed alongside backend code."""
        return {
            "status": "online",
            "message": "Backend API is running. Place 'frontend' folder next to main.py to serve UI.",
            "docs_url": "/docs",
        }


# ==========================================
# Application Runner
# ==========================================

if __name__ == "__main__":
    import uvicorn

    # Support dynamic PORT environment variable (required by Render and other cloud hosts)
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)