/**
 * ============================================================================
 * School Management Portal: شهدای هسته‌ای (Shohada-ye Haste'i)
 * Shared Application Utilities & Authentication Helpers
 * ============================================================================
 */

// Base API URL: empty string uses the same origin as the frontend
const API_BASE = "";

// Storage keys
const STORAGE_KEYS = {
    TOKEN: "shohada_auth_token",
    USER: "shohada_user_data",
    ROLE: "shohada_user_role",
};

/**
 * Persist user session upon successful login.
 * @param {string} token - The JWT access token
 * @param {object} user - User profile data (id, username, full_name, role, class_name, subject)
 */
function saveSession(token, user) {
    if (!token) return;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (user) {
        localStorage.setItem(STORAGE_KEYS.ROLE, user.role || "");
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
}

/**
 * Retrieve the current JWT access token from localStorage.
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Retrieve the current user's role ("teacher" or "student") from localStorage.
 * @returns {string|null}
 */
function getRole() {
    return localStorage.getItem(STORAGE_KEYS.ROLE);
}

/**
 * Retrieve the current user's profile object from localStorage.
 * @returns {object|null}
 */
function getUser() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.USER);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error reading stored user session:", e);
        return null;
    }
}

/**
 * Clear stored user credentials and session data.
 */
function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Perform an authenticated API request with JSON handling and auto-redirect on 401.
 * @param {string} path - The API endpoint path (e.g. "/api/school-info")
 * @param {object} [options={}] - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>}
 */
async function apiFetch(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const headers = { ...(options.headers || {}) };

    // Attach Bearer token if session exists
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Set JSON content-type if body is provided and not already configured
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle unauthorized status: clear session and redirect to login page
    if (response.status === 401) {
        clearSession();
        // Only redirect if not already on the login/index page
        if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
            window.location.href = "index.html";
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "احراز هویت انجام نشد. لطفاً مجدداً وارد سامانه شوید.");
    }

    // Parse JSON response body
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
    } else {
        data = await response.text().catch(() => null);
    }

    // If HTTP error code, throw error with backend's Persian detail message
    if (!response.ok) {
        let errorMessage = "خطایی در برقراری ارتباط رخ داده است";
        if (data && typeof data === "object" && data.detail) {
            errorMessage = data.detail;
        }
        throw new Error(errorMessage);
    }

    return data;
}

/**
 * Guard page route to require a specific role.
 * Redirects to index.html if the user is unauthenticated or has the wrong role.
 * @param {string} requiredRole - "teacher" or "student"
 */
function requireRole(requiredRole) {
    const token = getToken();
    const role = getRole();

    if (!token || !role || role !== requiredRole) {
        clearSession();
        window.location.href = "index.html";
        return false;
    }
    return true;
}

/**
 * Log out user by clearing session and redirecting to the home page.
 */
function logout() {
    clearSession();
    window.location.href = "index.html";
}

/**
 * Convert standard numbers/digits to Persian numerals.
 * @param {number|string} input
 * @returns {string}
 */
function toPersianDigits(input) {
    if (input === null || input === undefined) return "";
    const persianMap = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return String(input).replace(/[0-9]/g, (digit) => persianMap[Number(digit)]);
}

/**
 * Format a date string or timestamp into a Persian-friendly date format.
 * @param {string|Date} dateVal
 * @returns {string}
 */
function formatPersianDate(dateVal) {
    if (!dateVal) return "-";
    // If string already appears to be in Persian format (e.g. "۱۴۰۳/۰۸/۱۵"), return as is
    if (typeof dateVal === "string" && dateVal.includes("/")) {
        return toPersianDigits(dateVal);
    }
    try {
        const dateObj = new Date(dateVal);
        if (isNaN(dateObj.getTime())) return String(dateVal);
        return dateObj.toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch (e) {
        return String(dateVal);
    }
}

/**
 * Escape HTML special characters to prevent cross-site scripting (XSS).
 * Always use this helper before rendering untrusted text into the DOM.
 * @param {string|number} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format an academic score in the Iranian 0-20 scale.
 * @param {number} score
 * @returns {string}
 */
function formatScore(score) {
    if (score === null || score === undefined || isNaN(score)) return "-";
    const num = Number(score);
    // Display with up to two decimal places
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
    return toPersianDigits(formatted);
}


/**
 * Render a styled score badge based on the Iranian grading scale (0 - 20).
 * Color ranges:
 * - Green: 17 to 20 (عالی)
 * - Blue: 14 to 17 (خوب)
 * - Orange: 10 to 14 (متوسط / قابل قبول)
 * - Red: below 10 (نیاز به تلاش / مردود)
 * @param {number|null} score
 * @returns {string} HTML markup
 */
function getScoreBadge(score) {
    if (score === null || score === undefined || isNaN(score)) {
        return `<span class="badge badge-neutral">-</span>`;
    }
    const val = Number(score);
    let badgeClass = "score-badge-low";
    if (val >= 17) {
        badgeClass = "score-badge-excellent";
    } else if (val >= 14) {
        badgeClass = "score-badge-good";
    } else if (val >= 10) {
        badgeClass = "score-badge-medium";
    }

    return `<span class="score-badge ${badgeClass}">${formatScore(val)}</span>`;
}

/**
 * Show a floating Persian toast notification.
 * @param {string} message - The message in Persian
 * @param {"success"|"error"} type - Toast type
 */
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = type === "success" 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}
