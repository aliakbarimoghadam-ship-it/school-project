/**
 * ============================================================================
 * School Management Portal: شهدای هسته‌ای (Shohada-ye Haste'i)
 * Home Page & Authentication Logic (login.js)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Check if user is already authenticated and redirect accordingly
    checkExistingSession();

    // 2. Fetch and render public school information (About, Contact, News)
    loadSchoolInfo();

    // 3. Initialize login form interactions
    initLoginForm();

    // 4. Initialize password visibility toggle
    initPasswordToggle();
});

/**
 * If the user is already logged in with a valid token and role,
 * automatically redirect them to their respective dashboard.
 */
function checkExistingSession() {
    const token = getToken();
    const role = getRole();

    if (token && role) {
        if (role === "teacher") {
            window.location.href = "dashboard-teacher.html";
        } else if (role === "student") {
            window.location.href = "dashboard-student.html";
        }
    }
}

/**
 * Fetch public school details from /api/school-info and render on the home page.
 */
async function loadSchoolInfo() {
    const aboutContainer = document.getElementById("about-text-container");
    const newsContainer = document.getElementById("news-container");
    const addressEl = document.getElementById("contact-address");
    const phoneEl = document.getElementById("contact-phone");
    const emailEl = document.getElementById("contact-email");

    try {
        const info = await apiFetch("/api/school-info");

        // Render About Us section
        if (aboutContainer && info.about) {
            aboutContainer.innerHTML = `
                <p style="font-size: 1.05rem; line-height: 1.9; color: var(--text-main); text-align: justify;">
                    ${escapeHtml(info.about)}
                </p>
            `;
        }

        // Render Contact Information
        if (addressEl && info.address) addressEl.textContent = info.address;
        if (phoneEl && info.phone) phoneEl.textContent = info.phone;
        if (emailEl && info.email) emailEl.textContent = info.email;

        // Render News and Announcements
        if (newsContainer && Array.isArray(info.news)) {
            if (info.news.length === 0) {
                newsContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <span class="empty-state-icon">📢</span>
                        <h3 class="empty-state-title">اطلاعیه‌ای یافت نشد</h3>
                        <p class="empty-state-text">در حال حاضر خبر جدیدی در سامانه درج نشده است.</p>
                    </div>
                `;
            } else {
                newsContainer.innerHTML = info.news.map((item) => `
                    <article class="news-card">
                        <div>
                            <div class="news-date">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                <span>${formatPersianDate(item.date)}</span>
                            </div>
                            <h3 class="news-title">${escapeHtml(item.title)}</h3>
                            <p class="news-text">${escapeHtml(item.text)}</p>
                        </div>
                    </article>
                `).join("");
            }
        }
    } catch (err) {
        console.error("Error loading school info:", err);
        if (aboutContainer) {
            aboutContainer.innerHTML = `
                <div class="alert alert-warning">
                    خطا در برقراری ارتباط با سرور جهت دریافت اطلاعات مدرسه. لطفاً صفحه را تازه‌سازی فرمایید.
                </div>
            `;
        }
        if (newsContainer) {
            newsContainer.innerHTML = `
                <div class="alert alert-warning" style="grid-column: 1 / -1;">
                    بارگذاری اخبار با خطا مواجه شد.
                </div>
            `;
        }
    }
}

/**
 * Handle login form submission, authentication call, error display, and redirect.
 */
function initLoginForm() {
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("login-submit-btn");
    const alertBox = document.getElementById("login-alert");
    const alertText = document.getElementById("login-alert-text");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Reset previous alerts
        hideAlert();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Simple client-side presence validation
        if (!username || !password) {
            showAlert("لطفاً نام کاربری و رمز عبور را وارد نمایید.");
            if (!username) usernameInput.focus();
            else passwordInput.focus();
            return;
        }

        // Set button loading state
        setLoading(true);

        try {
            const data = await apiFetch("/api/login", {
                method: "POST",
                body: { username, password },
            });

            // Save JWT token and profile data in localStorage
            saveSession(data.access_token, data);

            // Redirect to appropriate dashboard based on user role
            if (data.role === "teacher") {
                window.location.href = "dashboard-teacher.html";
            } else if (data.role === "student") {
                window.location.href = "dashboard-student.html";
            } else {
                window.location.href = "index.html";
            }
        } catch (err) {
            setLoading(false);
            showAlert(err.message || "نام کاربری یا رمز عبور اشتباه است");
            passwordInput.focus();
        }
    });

    function showAlert(message) {
        if (alertBox && alertText) {
            alertText.textContent = message;
            alertBox.style.display = "flex";
        }
    }

    function hideAlert() {
        if (alertBox) {
            alertBox.style.display = "none";
        }
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        if (isLoading) {
            submitBtn.classList.add("is-loading");
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
        }
    }
}

/**
 * Configure show/hide password toggle button.
 */
function initPasswordToggle() {
    const toggleBtn = document.getElementById("toggle-pwd-btn");
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eye-icon");

    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";

        // Toggle eye icon appearance
        if (eyeIcon) {
            if (isPassword) {
                // Eye with slash (hide)
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                `;
            } else {
                // Normal eye (show)
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                `;
            }
        }
    });
}

/**
 * Quick-fill demo account details into the login form.
 * Attached to window so it is accessible from onclick attributes in the DOM.
 * @param {string} username
 * @param {string} password
 */
window.fillDemo = function (username, password) {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const alertBox = document.getElementById("login-alert");

    if (alertBox) alertBox.style.display = "none";
    if (usernameInput) usernameInput.value = username;
    if (passwordInput) passwordInput.value = password;

    // Smoothly focus submit button
    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) submitBtn.focus();
};
