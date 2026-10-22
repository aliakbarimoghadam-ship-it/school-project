/**
 * ============================================================================
 * School Management Portal: شهدای هسته‌ای (Shohada-ye Haste'i)
 * Student Dashboard Logic (student.js)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Guard route: require "student" role
    if (!requireRole("student")) return;

    // 2. Fetch and render student profile and summary KPI metrics
    await loadStudentProfile();

    // 3. Fetch and render student grades table and pure CSS visualizer
    await loadStudentGrades();
});

/**
 * Fetch student profile stats from /api/my-profile and populate summary cards.
 */
async function loadStudentProfile() {
    try {
        const profile = await apiFetch("/api/my-profile");

        // Header and Welcome elements
        const badgeEl = document.getElementById("student-profile-badge");
        const welcomeNameEl = document.getElementById("welcome-student-name");
        const welcomeClassEl = document.getElementById("welcome-student-class");

        if (badgeEl) {
            badgeEl.innerHTML = `👨‍🎓 دانش‌آموز: <strong>${escapeHtml(profile.full_name)}</strong>`;
        }
        if (welcomeNameEl) {
            welcomeNameEl.textContent = profile.full_name;
        }
        if (welcomeClassEl) {
            welcomeClassEl.textContent = `پایه و کلاس: ${profile.class_name || "تعیین‌نشده"}`;
        }

        // Summary KPI Cards
        const avgEl = document.getElementById("stat-student-avg");
        const countEl = document.getElementById("stat-student-grades-count");
        const bestEl = document.getElementById("stat-student-best");
        const lowestEl = document.getElementById("stat-student-lowest");

        if (avgEl) {
            avgEl.textContent = profile.average_score !== null ? formatScore(profile.average_score) : "-";
        }
        if (countEl) {
            countEl.textContent = toPersianDigits(profile.total_grades || 0);
        }
        if (bestEl) {
            if (profile.best_subject) {
                bestEl.innerHTML = `
                    <div style="font-weight: 800; font-size: 1.15rem; color: var(--success);">${escapeHtml(profile.best_subject)}</div>
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">نمره: ${formatScore(profile.best_score)}</div>
                `;
            } else {
                bestEl.textContent = "-";
            }
        }
        if (lowestEl) {
            if (profile.lowest_subject) {
                lowestEl.innerHTML = `
                    <div style="font-weight: 800; font-size: 1.15rem; color: var(--secondary);">${escapeHtml(profile.lowest_subject)}</div>
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">نمره: ${formatScore(profile.lowest_score)}</div>
                `;
            } else {
                lowestEl.textContent = "-";
            }
        }
    } catch (err) {
        console.error("Error loading student profile:", err);
    }
}

/**
 * Fetch student grades from /api/my-grades, render table and subject progress visualizer.
 */
async function loadStudentGrades() {
    const tbody = document.getElementById("student-grades-table-body");
    const visualizerContainer = document.getElementById("subject-visualizer-container");
    const hintEl = document.getElementById("grades-count-hint");

    try {
        const data = await apiFetch("/api/my-grades");
        const grades = data.grades || [];
        const bySubject = data.by_subject || {};

        if (hintEl) {
            hintEl.textContent = `مجموع نمرات ثبت‌شده: ${toPersianDigits(grades.length)} نمره | معدل کل: ${data.average_score !== null ? formatScore(data.average_score) : "-"}`;
        }

        // Render Grades Table
        renderGradesTable(grades, tbody);

        // Render Pure CSS Bar Visualizer
        renderSubjectBars(bySubject, visualizerContainer);

    } catch (err) {
        console.error("Error loading student grades:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <span class="empty-state-icon">⚠️</span>
                        <h4 class="empty-state-title">خطا در بارگذاری نمرات</h4>
                        <p class="empty-state-text">${escapeHtml(err.message)}</p>
                    </td>
                </tr>
            `;
        }
        if (visualizerContainer) {
            visualizerContainer.innerHTML = `
                <div class="alert alert-warning" style="grid-column: 1 / -1;">
                    امکان بارگذاری نمودار دروس در حال حاضر وجود ندارد.
                </div>
            `;
        }
    }
}

/**
 * Render all grades into the table.
 * Note: Strictly Read-Only (no edit or delete controls).
 * @param {Array} grades
 * @param {HTMLElement} tbody
 */
function renderGradesTable(grades, tbody) {
    if (!tbody) return;

    if (grades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <span class="empty-state-icon">📝</span>
                    <h4 class="empty-state-title">هنوز نمره‌ای ثبت نشده است</h4>
                    <p class="empty-state-text">تاکنون ارزشیابی یا نمره‌ای برای حساب شما در سامانه ثبت نگردیده است.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = grades.map((g, idx) => `
        <tr>
            <td data-label="ردیف" style="color: var(--text-subtle); font-weight: 600;">${toPersianDigits(idx + 1)}</td>
            <td data-label="درس" style="font-weight: 700; color: var(--secondary);">${escapeHtml(g.subject)}</td>
            <td data-label="نمره">${getScoreBadge(g.score)}</td>
            <td data-label="ترم / نیمسال">
                <span class="badge badge-neutral">${escapeHtml(g.term)}</span>
            </td>
            <td data-label="دبیر ارزیاب">${escapeHtml(g.teacher_name || "-")}</td>
            <td data-label="توضیحات معلم" style="color: var(--text-muted); font-size: 0.9rem;">
                ${escapeHtml(g.comment || "-")}
            </td>
            <td data-label="تاریخ ثبت" style="color: var(--text-subtle); font-size: 0.85rem;">
                ${formatPersianDate(g.created_at)}
            </td>
        </tr>
    `).join("");
}

/**
 * Render pure CSS/HTML horizontal progress bars for each subject.
 * @param {Object} bySubject - Map of subjectName -> array of grades
 * @param {HTMLElement} container
 */
function renderSubjectBars(bySubject, container) {
    if (!container) return;

    const subjects = Object.keys(bySubject);
    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
                <span class="empty-state-icon">📊</span>
                <h4 class="empty-state-title">هنوز اطلاعاتی برای نمایش نمودار وجود ندارد</h4>
                <p class="empty-state-text">پس از ثبت اولین نمرات، نمودار پیشرفت به صورت خودکار فعال می‌شود.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = subjects.map((subject) => {
        const subjectGrades = bySubject[subject] || [];
        if (subjectGrades.length === 0) return "";

        const avg = subjectGrades.reduce((sum, g) => sum + g.score, 0) / subjectGrades.length;
        const percentage = Math.min(100, Math.max(0, (avg / 20) * 100));

        let fillClass = "bar-fill-low";
        if (avg >= 17) fillClass = "bar-fill-excellent";
        else if (avg >= 14) fillClass = "bar-fill-good";
        else if (avg >= 10) fillClass = "bar-fill-medium";

        return `
            <div class="subject-bar-card">
                <div class="subject-bar-header">
                    <span class="subject-bar-title">${escapeHtml(subject)}</span>
                    <span class="subject-bar-score">${getScoreBadge(avg)}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${fillClass}" style="width: ${percentage.toFixed(1)}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
                    <span>تعداد ارزیابی‌ها: ${toPersianDigits(subjectGrades.length)}</span>
                    <span>میانگین: ${formatScore(avg)} از ۲۰</span>
                </div>
            </div>
        `;
    }).join("");
}
