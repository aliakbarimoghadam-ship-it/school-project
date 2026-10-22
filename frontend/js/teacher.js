/**
 * ============================================================================
 * School Management Portal: شهدای هسته‌ای (Shohada-ye Haste'i)
 * Teacher Dashboard Logic (teacher.js)
 * ============================================================================
 */

// State variables
let currentTeacher = null;
let allStudents = [];
let activeStudent = null;
let activeStudentGrades = [];

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Guard route: require "teacher" role
    if (!requireRole("teacher")) return;

    // 2. Load teacher profile details
    await initTeacherProfile();

    // 3. Load classes list into filter dropdown
    await loadClassesFilter();

    // 4. Fetch students roster & summary statistics
    await loadStudents();

    // 5. Initialize search and filter event listeners
    initSearchAndFilters();

    // 6. Initialize grade creation & editing forms
    initGradeForms();
});

/**
 * Initialize current teacher profile in header.
 */
async function initTeacherProfile() {
    try {
        // Fetch fresh profile from API to ensure accurate user ID and subject
        const me = await apiFetch("/api/me");
        if (me) {
            currentTeacher = {
                ...getUser(),
                ...me,
                user_id: me.id,
                id: me.id,
            };
            saveSession(getToken(), currentTeacher);
        } else {
            currentTeacher = getUser();
            if (currentTeacher) {
                currentTeacher.id = currentTeacher.id || currentTeacher.user_id;
            }
        }

        const badgeEl = document.getElementById("teacher-profile-badge");
        if (badgeEl && currentTeacher) {
            const subjectText = currentTeacher.subject ? ` (دبیر ${escapeHtml(currentTeacher.subject)})` : "";
            badgeEl.innerHTML = `👨‍🏫 دبیر گرامی: <strong>${escapeHtml(currentTeacher.full_name)}</strong>${subjectText}`;
        }
    } catch (e) {
        console.error("Error initializing teacher profile:", e);
        currentTeacher = getUser();
        if (currentTeacher) {
            currentTeacher.id = currentTeacher.id || currentTeacher.user_id;
        }
    }
}

/**
 * Fetch distinct school classes and populate the filter dropdown.
 */
async function loadClassesFilter() {
    const classFilter = document.getElementById("class-filter");
    if (!classFilter) return;

    try {
        const classes = await apiFetch("/api/classes");
        if (Array.isArray(classes)) {
            classes.forEach((cls) => {
                const opt = document.createElement("option");
                opt.value = cls;
                opt.textContent = cls;
                classFilter.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error loading classes filter:", e);
    }
}

/**
 * Load students roster from API, optionally filtered by class.
 */
async function loadStudents() {
    const classFilter = document.getElementById("class-filter");
    const selectedClass = classFilter ? classFilter.value : "";
    const tbody = document.getElementById("students-table-body");
    const countHint = document.getElementById("students-count-hint");

    const endpoint = selectedClass 
        ? `/api/students?class_name=${encodeURIComponent(selectedClass)}`
        : "/api/students";

    try {
        allStudents = await apiFetch(endpoint);
        renderSummaryStats(allStudents);
        renderStudentsTable(allStudents);

        if (countHint) {
            countHint.textContent = `نمایش ${toPersianDigits(allStudents.length)} دانش‌آموز`;
        }
    } catch (err) {
        console.error("Error loading students:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <span class="empty-state-icon">⚠️</span>
                        <h4 class="empty-state-title">خطا در بارگذاری دانش‌آموزان</h4>
                        <p class="empty-state-text">${escapeHtml(err.message)}</p>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Calculate and render summary metrics across students.
 * @param {Array} students
 */
function renderSummaryStats(students) {
    const totalStudentsEl = document.getElementById("stat-total-students");
    const totalGradesEl = document.getElementById("stat-total-grades");
    const overallAvgEl = document.getElementById("stat-overall-avg");

    const totalStudents = students.length;
    let totalGrades = 0;
    let weightedScoreSum = 0;
    let totalGradedScoresCount = 0;

    students.forEach((s) => {
        const count = s.total_grades || 0;
        totalGrades += count;
        if (s.average_score !== null && count > 0) {
            weightedScoreSum += (s.average_score * count);
            totalGradedScoresCount += count;
        }
    });

    const overallAvg = totalGradedScoresCount > 0 ? (weightedScoreSum / totalGradedScoresCount) : null;

    if (totalStudentsEl) totalStudentsEl.textContent = toPersianDigits(totalStudents);
    if (totalGradesEl) totalGradesEl.textContent = toPersianDigits(totalGrades);
    if (overallAvgEl) overallAvgEl.textContent = overallAvg !== null ? formatScore(overallAvg) : "-";
}

/**
 * Render students into the table body.
 * @param {Array} students
 */
function renderStudentsTable(students) {
    const tbody = document.getElementById("students-table-body");
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="empty-state-icon">🔍</span>
                    <h4 class="empty-state-title">دانش‌آموزی یافت نشد</h4>
                    <p class="empty-state-text">دانش‌آموزی با مشخصات مورد نظر در این کلاس وجود ندارد.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map((s, idx) => `
        <tr>
            <td data-label="ردیف" style="color: var(--text-subtle); font-weight: 600;">${toPersianDigits(idx + 1)}</td>
            <td data-label="نام و شناسه">
                <div style="font-weight: 700; color: var(--secondary);">${escapeHtml(s.full_name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-subtle);">شناسه: ${escapeHtml(s.username)}</div>
            </td>
            <td data-label="کلاس">
                <span class="badge badge-neutral">${escapeHtml(s.class_name || "-")}</span>
            </td>
            <td data-label="تعداد نمرات">${toPersianDigits(s.total_grades || 0)} نمره</td>
            <td data-label="معدل کل">${getScoreBadge(s.average_score)}</td>
            <td data-label="عملیات" style="text-align: center;">
                <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    onclick="openStudentModal(${s.id}, '${escapeHtml(s.full_name)}', '${escapeHtml(s.class_name || '')}')"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>مشاهده / ثبت نمره</span>
                </button>
            </td>
        </tr>
    `).join("");
}

/**
 * Setup real-time client-side search by student name and class change filter.
 */
function initSearchAndFilters() {
    const searchInput = document.getElementById("student-search");
    const classFilter = document.getElementById("class-filter");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (!query) {
                renderStudentsTable(allStudents);
                return;
            }
            const filtered = allStudents.filter((s) =>
                (s.full_name && s.full_name.toLowerCase().includes(query)) ||
                (s.username && s.username.toLowerCase().includes(query))
            );
            renderStudentsTable(filtered);
        });
    }

    if (classFilter) {
        classFilter.addEventListener("change", () => {
            loadStudents();
        });
    }
}

/**
 * Open the student modal and load his/her grades.
 * @param {number} studentId
 * @param {string} studentName
 * @param {string} className
 */
window.openStudentModal = async function (studentId, studentName, className) {
    activeStudent = { id: studentId, full_name: studentName, class_name: className };

    const modal = document.getElementById("student-modal");
    const titleEl = document.getElementById("modal-student-title");
    const subtitleEl = document.getElementById("modal-student-subtitle");
    const hiddenIdInput = document.getElementById("grade-student-id");
    const subjectSelect = document.getElementById("grade-subject");

    if (titleEl) titleEl.textContent = `کارنامه و ثبت نمره: ${studentName}`;
    if (subtitleEl) subtitleEl.textContent = `پایه و کلاس: ${className || "نامشخص"}`;
    if (hiddenIdInput) hiddenIdInput.value = studentId;

    // Default subject to teacher's subject if available
    if (subjectSelect && currentTeacher && currentTeacher.subject) {
        for (let i = 0; i < subjectSelect.options.length; i++) {
            if (subjectSelect.options[i].value === currentTeacher.subject) {
                subjectSelect.selectedIndex = i;
                break;
            }
        }
    }

    // Show modal
    if (modal) {
        modal.classList.add("is-active");
        modal.setAttribute("aria-hidden", "false");
    }

    // Fetch and render grades
    await refreshStudentGrades();
};

/**
 * Close the student grades modal.
 */
window.closeStudentModal = function () {
    const modal = document.getElementById("student-modal");
    if (modal) {
        modal.classList.remove("is-active");
        modal.setAttribute("aria-hidden", "true");
    }
    activeStudent = null;
    activeStudentGrades = [];
};

/**
 * Fetch and refresh the active student's grades list.
 */
async function refreshStudentGrades() {
    if (!activeStudent) return;
    const tbody = document.getElementById("student-grades-table-body");
    const countBadge = document.getElementById("modal-grades-count");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-container">
                    <div class="spinner"></div>
                    <span>در حال بارگذاری نمرات...</span>
                </td>
            </tr>
        `;
    }

    try {
        activeStudentGrades = await apiFetch(`/api/students/${activeStudent.id}/grades`);

        if (countBadge) {
            countBadge.textContent = `${toPersianDigits(activeStudentGrades.length)} نمره`;
        }

        if (activeStudentGrades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <span class="empty-state-icon">📝</span>
                        <h4 class="empty-state-title">هنوز نمره‌ای ثبت نشده است</h4>
                        <p class="empty-state-text">با استفاده از فرم بالا می‌توانید اولین نمره را برای این دانش‌آموز ثبت فرمایید.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = activeStudentGrades.map((g) => {
            const currentTeacherId = Number(currentTeacher?.id || currentTeacher?.user_id || 0);
            const gradeTeacherId = Number(g.teacher_id || 0);
            const teacherSubject = (currentTeacher?.subject || "").trim();
            const gradeSubject = (g.subject || "").trim();

            const isOwner = currentTeacherId > 0 && gradeTeacherId === currentTeacherId;
            const isSameSubject = Boolean(teacherSubject && gradeSubject && teacherSubject === gradeSubject);
            const canEdit = isOwner || isSameSubject;

            return `
                <tr>
                    <td data-label="درس" style="font-weight: 700; color: var(--secondary);">${escapeHtml(g.subject)}</td>
                    <td data-label="نمره">${getScoreBadge(g.score)}</td>
                    <td data-label="ترم / نیمسال">${escapeHtml(g.term)}</td>
                    <td data-label="دبیر ثبت‌کننده">
                        <div style="font-size: 0.88rem;">${escapeHtml(g.teacher_name || "-")}</div>
                        ${isOwner ? '<span class="badge badge-primary" style="font-size: 0.7rem; margin-top: 2px;">ثبت‌شده توسط شما</span>' : (isSameSubject ? `<span class="badge badge-success" style="font-size: 0.7rem; margin-top: 2px;">درس شما (${escapeHtml(teacherSubject)})</span>` : '')}
                    </td>
                    <td data-label="توضیحات معلم" style="font-size: 0.88rem; color: var(--text-muted); max-width: 200px;">
                        ${escapeHtml(g.comment || "-")}
                    </td>
                    <td data-label="تاریخ ثبت" style="font-size: 0.82rem; color: var(--text-subtle);">
                        ${formatPersianDate(g.created_at)}
                    </td>
                    <td data-label="عملیات" style="text-align: center;">
                        ${canEdit ? `
                            <div style="display: flex; gap: 0.35rem; justify-content: center;">
                                <button
                                    type="button"
                                    class="btn btn-secondary btn-sm"
                                    style="padding: 0.35rem 0.65rem;"
                                    title="ویرایش نمره"
                                    onclick="openEditModal(${g.id}, '${escapeHtml(g.subject)}', ${g.score}, '${escapeHtml(g.term)}', '${escapeHtml(g.comment || '')}')"
                                >
                                    ✏️ ویرایش
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-outline btn-sm"
                                    style="padding: 0.35rem 0.65rem; color: var(--danger); border-color: var(--danger-border);"
                                    title="حذف نمره"
                                    onclick="deleteGrade(${g.id})"
                                >
                                    🗑️ حذف
                                </button>
                            </div>
                        ` : `
                            <span class="badge badge-neutral" style="font-size: 0.74rem;" title="ویرایش فقط توسط دبیر ${escapeHtml(g.subject)} امکان‌پذیر است">
                                درس دبیر دیگر (${escapeHtml(g.subject)})
                            </span>
                        `}
                    </td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error("Error loading student grades:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="alert alert-danger" style="margin: 1rem;">
                        خطا در دریافت ریز نمرات: ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Configure Add Grade and Edit Grade form event handlers.
 */
function initGradeForms() {
    // Add Grade Form
    const addForm = document.getElementById("add-grade-form");
    if (addForm) {
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const studentId = Number(document.getElementById("grade-student-id").value);
            const subject = document.getElementById("grade-subject").value;
            const scoreInput = document.getElementById("grade-score");
            const term = document.getElementById("grade-term").value;
            const comment = document.getElementById("grade-comment").value.trim();
            const submitBtn = document.getElementById("submit-grade-btn");

            const score = parseFloat(scoreInput.value);

            // Validation
            if (isNaN(score) || score < 0 || score > 20) {
                showToast("نمره باید عددی بین ۰ تا ۲۰ باشد", "error");
                scoreInput.focus();
                return;
            }

            if (submitBtn) {
                submitBtn.classList.add("is-loading");
                submitBtn.disabled = true;
            }

            try {
                await apiFetch("/api/grades", {
                    method: "POST",
                    body: {
                        student_id: studentId,
                        subject,
                        score,
                        term,
                        comment: comment || null,
                    },
                });

                showToast("نمره با موفقیت ثبت شد", "success");
                scoreInput.value = "";
                document.getElementById("grade-comment").value = "";

                // Refresh modal grades and student roster in background
                await refreshStudentGrades();
                await loadStudents();
            } catch (err) {
                showToast(err.message || "خطا در ثبت نمره", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove("is-loading");
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Edit Grade Form
    const editForm = document.getElementById("edit-grade-form");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const gradeId = document.getElementById("edit-grade-id").value;
            const subject = document.getElementById("edit-grade-subject").value;
            const scoreInput = document.getElementById("edit-grade-score");
            const term = document.getElementById("edit-grade-term").value;
            const comment = document.getElementById("edit-grade-comment").value.trim();
            const saveBtn = document.getElementById("save-edit-grade-btn");

            const score = parseFloat(scoreInput.value);
            if (isNaN(score) || score < 0 || score > 20) {
                showToast("نمره باید عددی بین ۰ تا ۲۰ باشد", "error");
                scoreInput.focus();
                return;
            }

            if (saveBtn) {
                saveBtn.classList.add("is-loading");
                saveBtn.disabled = true;
            }

            try {
                await apiFetch(`/api/grades/${gradeId}`, {
                    method: "PUT",
                    body: {
                        subject,
                        score,
                        term,
                        comment: comment || null,
                    },
                });

                showToast("نمره با موفقیت ویرایش شد", "success");
                closeEditModal();

                // Refresh modal and table
                await refreshStudentGrades();
                await loadStudents();
            } catch (err) {
                showToast(err.message || "خطا در ویرایش نمره", "error");
            } finally {
                if (saveBtn) {
                    saveBtn.classList.remove("is-loading");
                    saveBtn.disabled = false;
                }
            }
        });
    }
}

/**
 * Open the Edit Grade modal with pre-populated values.
 * @param {number} gradeId
 * @param {string} subject
 * @param {number} score
 * @param {string} term
 * @param {string} comment
 */
window.openEditModal = function (gradeId, subject, score, term, comment) {
    const editModal = document.getElementById("edit-grade-modal");
    document.getElementById("edit-grade-id").value = gradeId;
    document.getElementById("edit-grade-subject").value = subject;
    document.getElementById("edit-grade-score").value = score;
    document.getElementById("edit-grade-term").value = term;
    document.getElementById("edit-grade-comment").value = comment || "";

    if (editModal) {
        editModal.classList.add("is-active");
        editModal.setAttribute("aria-hidden", "false");
    }
};

/**
 * Close the Edit Grade modal.
 */
window.closeEditModal = function () {
    const editModal = document.getElementById("edit-grade-modal");
    if (editModal) {
        editModal.classList.remove("is-active");
        editModal.setAttribute("aria-hidden", "true");
    }
};

/**
 * Confirm and delete a grade.
 * @param {number} gradeId
 */
window.deleteGrade = async function (gradeId) {
    if (!confirm("آیا از حذف این نمره اطمینان دارید؟ این عملیات غیرقابل بازگشت است.")) {
        return;
    }

    try {
        await apiFetch(`/api/grades/${gradeId}`, {
            method: "DELETE",
        });

        showToast("نمره با موفقیت حذف شد", "success");

        // Refresh modal and table
        await refreshStudentGrades();
        await loadStudents();
    } catch (err) {
        showToast(err.message || "خطا در حذف نمره", "error");
    }
};
