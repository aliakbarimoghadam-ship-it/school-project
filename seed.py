import sys
from pathlib import Path

# Add backend directory to sys.path to allow standalone execution
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import engine, SessionLocal, Base
from models import User, Grade
from auth import hash_password


def seed_database(force: bool = False):
    """Create database tables and insert demo/sample records."""
    print("Creating tables in SQLite database...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if database already has users
        existing_users_count = db.query(User).count()
        if existing_users_count > 0 and not force:
            print(f"Database already contains {existing_users_count} users. Skipping seeding.")
            return

        if force:
            print("Force reseed: removing existing records...")
            db.query(Grade).delete()
            db.query(User).delete()
            db.commit()

        print("Seeding demo users (Shohada-ye Haste'i School)...")

        # ----------------------------------------------------
        # 1. School Administrator (Admin)
        # ----------------------------------------------------
        admin_pwd_hash = hash_password("admin123")
        admin = User(
            username="admin",
            password_hash=admin_pwd_hash,
            full_name="مدیریت سامانه (دکتر حسینی)",
            role="admin",
            subject=None,
            class_name=None,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        # ----------------------------------------------------
        # 2. Teachers (5 Teachers)
        # ----------------------------------------------------
        teacher_pwd_hash = hash_password("teacher123")
        teachers = [
            User(
                username="teacher1",
                password_hash=teacher_pwd_hash,
                full_name="علیرضا رضایی",
                role="teacher",
                subject="ریاضی",
                class_name=None,
            ),
            User(
                username="teacher2",
                password_hash=teacher_pwd_hash,
                full_name="زهرا حسینی",
                role="teacher",
                subject="علوم",
                class_name=None,
            ),
            User(
                username="teacher3",
                password_hash=teacher_pwd_hash,
                full_name="محمد کریمی",
                role="teacher",
                subject="فارسی",
                class_name=None,
            ),
            User(
                username="teacher4",
                password_hash=teacher_pwd_hash,
                full_name="مریم احمدی",
                role="teacher",
                subject="عربی",
                class_name=None,
            ),
            User(
                username="teacher5",
                password_hash=teacher_pwd_hash,
                full_name="علی صادقی",
                role="teacher",
                subject="انگلیسی",
                class_name=None,
            ),
        ]
        db.add_all(teachers)
        db.commit()

        # Refresh teachers to get generated IDs
        for t in teachers:
            db.refresh(t)

        t_math = teachers[0]       # ریاضی
        t_science = teachers[1]    # علوم
        t_farsi = teachers[2]      # فارسی
        t_arabic = teachers[3]     # عربی
        t_english = teachers[4]    # انگلیسی

        # ----------------------------------------------------
        # 3. Students (10 Students spread across 2 classes)
        # ----------------------------------------------------
        student_pwd_hash = hash_password("student123")
        students = [
            # Class: هفتم الف (5 دانش‌آموز)
            User(
                username="student1",
                password_hash=student_pwd_hash,
                full_name="محمدامین احمدی",
                role="student",
                class_name="هفتم الف",
                subject=None,
            ),
            User(
                username="student2",
                password_hash=student_pwd_hash,
                full_name="سارا محمدی",
                role="student",
                class_name="هفتم الف",
                subject=None,
            ),
            User(
                username="student3",
                password_hash=student_pwd_hash,
                full_name="علی کریمی",
                role="student",
                class_name="هفتم الف",
                subject=None,
            ),
            User(
                username="student4",
                password_hash=student_pwd_hash,
                full_name="نرگس صادقی",
                role="student",
                class_name="هفتم الف",
                subject=None,
            ),
            User(
                username="student5",
                password_hash=student_pwd_hash,
                full_name="رضا مرادی",
                role="student",
                class_name="هفتم الف",
                subject=None,
            ),
            # Class: هفتم ب (5 دانش‌آموز)
            User(
                username="student6",
                password_hash=student_pwd_hash,
                full_name="امیرحسین باقری",
                role="student",
                class_name="هفتم ب",
                subject=None,
            ),
            User(
                username="student7",
                password_hash=student_pwd_hash,
                full_name="فاطمه موسوی",
                role="student",
                class_name="هفتم ب",
                subject=None,
            ),
            User(
                username="student8",
                password_hash=student_pwd_hash,
                full_name="حسین ابراهیمی",
                role="student",
                class_name="هفتم ب",
                subject=None,
            ),
            User(
                username="student9",
                password_hash=student_pwd_hash,
                full_name="مهسا قاسمی",
                role="student",
                class_name="هفتم ب",
                subject=None,
            ),
            User(
                username="student10",
                password_hash=student_pwd_hash,
                full_name="پارسا نوروزی",
                role="student",
                class_name="هفتم ب",
                subject=None,
            ),
        ]
        db.add_all(students)
        db.commit()

        # Refresh students to obtain generated IDs
        for s in students:
            db.refresh(s)

        # ----------------------------------------------------
        # 4. Sample Grades
        # Every teacher registers grades for their respective subject
        # ----------------------------------------------------
        term_name = "نیمسال اول"

        grades_data = [
            # --- Student 1: محمدامین احمدی (هفتم الف) ---
            Grade(student_id=students[0].id, teacher_id=t_math.id, subject="ریاضی", score=19.5, term=term_name, comment="حل مسائل پیشرفته با تسلط کامل"),
            Grade(student_id=students[0].id, teacher_id=t_science.id, subject="علوم", score=18.0, term=term_name, comment="گزارش کار آزمایشگاه بسیار منظم"),
            Grade(student_id=students[0].id, teacher_id=t_farsi.id, subject="فارسی", score=17.5, term=term_name, comment="انشای خلاقانه و خط زیبا"),
            Grade(student_id=students[0].id, teacher_id=t_arabic.id, subject="عربی", score=18.5, term=term_name, comment="ترجمه روان متون کتاب"),
            Grade(student_id=students[0].id, teacher_id=t_english.id, subject="انگلیسی", score=19.0, term=term_name, comment="درک مطلب و مکالمه عالی"),

            # --- Student 2: سارا محمدی (هفتم الف) ---
            Grade(student_id=students[1].id, teacher_id=t_math.id, subject="ریاضی", score=16.0, term=term_name, comment="پیشرفت خوب، نیاز به تمرین در هندسه"),
            Grade(student_id=students[1].id, teacher_id=t_science.id, subject="علوم", score=19.5, term=term_name, comment="فعالیت کلاسی و هوش بالا"),
            Grade(student_id=students[1].id, teacher_id=t_farsi.id, subject="فارسی", score=19.0, term=term_name, comment="ادبیات عالی و مشارکت در روخوانی"),
            Grade(student_id=students[1].id, teacher_id=t_arabic.id, subject="عربی", score=17.0, term=term_name, comment="قواعد صرف و نحو رضایت‌بخش"),
            Grade(student_id=students[1].id, teacher_id=t_english.id, subject="انگلیسی", score=18.0, term=term_name, comment="تلفظ واژگان خوب"),

            # --- Student 3: علی کریمی (هفتم الف) ---
            Grade(student_id=students[2].id, teacher_id=t_math.id, subject="ریاضی", score=14.0, term=term_name, comment="تلاش مستمر، دقت بیشتر در محاسبات"),
            Grade(student_id=students[2].id, teacher_id=t_science.id, subject="علوم", score=15.5, term=term_name, comment="مشارکت خوب در کارهای گروهی"),
            Grade(student_id=students[2].id, teacher_id=t_farsi.id, subject="فارسی", score=16.5, term=term_name, comment="نگارش مطلوب"),
            Grade(student_id=students[2].id, teacher_id=t_arabic.id, subject="عربی", score=15.0, term=term_name, comment="نیاز به تمرین در ترجمه جملات"),
            Grade(student_id=students[2].id, teacher_id=t_english.id, subject="انگلیسی", score=16.0, term=term_name, comment="پیشرفت قابل تقدیر"),

            # --- Student 4: نرگس صادقی (هفتم الف) ---
            Grade(student_id=students[3].id, teacher_id=t_math.id, subject="ریاضی", score=17.0, term=term_name, comment="پاسخگویی بسیار منظم به تمرین‌ها"),
            Grade(student_id=students[3].id, teacher_id=t_science.id, subject="علوم", score=18.5, term=term_name, comment="آزمایش‌های دقیق شیمی"),
            Grade(student_id=students[3].id, teacher_id=t_farsi.id, subject="فارسی", score=19.5, term=term_name, comment="حفظ شعر و انشای نمونه"),
            Grade(student_id=students[3].id, teacher_id=t_arabic.id, subject="عربی", score=19.0, term=term_name, comment="تسلط بر لغات جدید"),
            Grade(student_id=students[3].id, teacher_id=t_english.id, subject="انگلیسی", score=18.5, term=term_name, comment="نمرات مستمر عالی"),

            # --- Student 5: رضا مرادی (هفتم الف) ---
            Grade(student_id=students[4].id, teacher_id=t_math.id, subject="ریاضی", score=12.5, term=term_name, comment="نیاز به حل تمرین بیشتر در منزل"),
            Grade(student_id=students[4].id, teacher_id=t_science.id, subject="علوم", score=13.0, term=term_name, comment="تکالیف نیازمند پیگیری بیشتر است"),
            Grade(student_id=students[4].id, teacher_id=t_farsi.id, subject="فارسی", score=15.0, term=term_name, comment="روخوانی متوسط"),
            Grade(student_id=students[4].id, teacher_id=t_arabic.id, subject="عربی", score=13.5, term=term_name, comment="حفظ لغات نیاز به مرور دارد"),
            Grade(student_id=students[4].id, teacher_id=t_english.id, subject="انگلیسی", score=14.0, term=term_name, comment="تلاش برای بهتر شدن"),

            # --- Student 6: امیرحسین باقری (هفتم ب) ---
            Grade(student_id=students[5].id, teacher_id=t_math.id, subject="ریاضی", score=20.0, term=term_name, comment="استعداد فوق‌العاده در ریاضیات"),
            Grade(student_id=students[5].id, teacher_id=t_science.id, subject="علوم", score=19.0, term=term_name, comment="تحلیل‌های علمی عمیق"),
            Grade(student_id=students[5].id, teacher_id=t_farsi.id, subject="فارسی", score=18.5, term=term_name, comment="نگارش روان و خلاقانه"),
            Grade(student_id=students[5].id, teacher_id=t_arabic.id, subject="عربی", score=19.0, term=term_name, comment="تسلط کامل بر تمارین درس"),
            Grade(student_id=students[5].id, teacher_id=t_english.id, subject="انگلیسی", score=20.0, term=term_name, comment="مکالمه انگلیسی کامپکت و عالی"),

            # --- Student 7: فاطمه موسوی (هفتم ب) ---
            Grade(student_id=students[6].id, teacher_id=t_math.id, subject="ریاضی", score=17.5, term=term_name, comment="انضباط و دقت عالی در حل تمرین‌ها"),
            Grade(student_id=students[6].id, teacher_id=t_science.id, subject="علوم", score=18.5, term=term_name, comment="علاقه‌مند به زیست‌شناسی"),
            Grade(student_id=students[6].id, teacher_id=t_farsi.id, subject="فارسی", score=19.0, term=term_name, comment="آرایه‌های ادبی را عالی تشخیص می‌دهد"),
            Grade(student_id=students[6].id, teacher_id=t_arabic.id, subject="عربی", score=18.0, term=term_name, comment="پاسخ‌های بدون غلط"),
            Grade(student_id=students[6].id, teacher_id=t_english.id, subject="انگلیسی", score=17.5, term=term_name, comment="مهارت شنیداری بسیار خوب"),

            # --- Student 8: حسین ابراهیمی (هفتم ب) ---
            Grade(student_id=students[7].id, teacher_id=t_math.id, subject="ریاضی", score=11.0, term=term_name, comment="نیاز به شرکت در کلاس‌های تقویتی"),
            Grade(student_id=students[7].id, teacher_id=t_science.id, subject="علوم", score=12.5, term=term_name, comment="تکالیف به موقع تحویل داده شود"),
            Grade(student_id=students[7].id, teacher_id=t_farsi.id, subject="فارسی", score=14.0, term=term_name, comment="انشا نیاز به شاخ و برگ بیشتری دارد"),
            Grade(student_id=students[7].id, teacher_id=t_arabic.id, subject="عربی", score=13.0, term=term_name, comment="ترجمه نیازمند مرور است"),
            Grade(student_id=students[7].id, teacher_id=t_english.id, subject="انگلیسی", score=12.0, term=term_name, comment="تمرین لغات روزانه توصیه می‌شود"),

            # --- Student 9: مهسا قاسمی (هفتم ب) ---
            Grade(student_id=students[8].id, teacher_id=t_math.id, subject="ریاضی", score=18.0, term=term_name, comment="نظم ستودنی و نمرات رو به رشد"),
            Grade(student_id=students[8].id, teacher_id=t_science.id, subject="علوم", score=17.0, term=term_name, comment="ارائه کلاسی جالب"),
            Grade(student_id=students[8].id, teacher_id=t_farsi.id, subject="فارسی", score=18.5, term=term_name, comment="پاسخ‌های کامل و تمیز در برگه امتحانی"),
            Grade(student_id=students[8].id, teacher_id=t_arabic.id, subject="عربی", score=17.5, term=term_name, comment="همکاری در کلاس عالی"),
            Grade(student_id=students[8].id, teacher_id=t_english.id, subject="انگلیسی", score=18.5, term=term_name, comment="پیشرفت چشمگیر"),

            # --- Student 10: پارسا نوروزی (هفتم ب) ---
            Grade(student_id=students[9].id, teacher_id=t_math.id, subject="ریاضی", score=16.5, term=term_name, comment="استدلال‌های منطقی قوی"),
            Grade(student_id=students[9].id, teacher_id=t_science.id, subject="علوم", score=16.0, term=term_name, comment="علاقه به پژوهش‌های زمین‌شناسی"),
            Grade(student_id=students[9].id, teacher_id=t_farsi.id, subject="فارسی", score=17.0, term=term_name, comment="خط تحریری زیبا و دقت در املای کلمات"),
            Grade(student_id=students[9].id, teacher_id=t_arabic.id, subject="عربی", score=16.0, term=term_name, comment="درک خوب از ساختار زبان"),
            Grade(student_id=students[9].id, teacher_id=t_english.id, subject="انگلیسی", score=17.0, term=term_name, comment="تکالیف همواره منظم و سر وقت"),
        ]

        db.add_all(grades_data)
        db.commit()

        print("Successfully seeded:")
        print(" - 1 Administrator")
        print(f" - {len(teachers)} Teachers")
        print(f" - {len(students)} Students (across 2 classes)")
        print(f" - {len(grades_data)} Grades (across 5 subjects)")

    except Exception as e:
        db.rollback()
        print(f"Error during database seeding: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    seed_database(force=force_flag)
