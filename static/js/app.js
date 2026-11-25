
"use strict";

/* =====================================================
   EDUTRACK - CANDY CAMPUS
   COMPLETE FRONTEND JAVASCRIPT
   FLASK + FIREBASE CLOUD FIRESTORE
===================================================== */


/* =====================================================
   1. CONFIGURATION
===================================================== */

const API = "/api";

const $ = id => document.getElementById(id);

const kinds = [
    "students",
    "courses",
    "enrollments"
];


/* ORIGINAL FIRESTORE FIELD NAMES */

const schemas = {

    students: [
        "student_id",
        "full_name",
        "email",
        "gender",
        "birth_date",
        "phone",
        "address",
        "status"
    ],

    courses: [
        "course_code",
        "course_name",
        "department",
        "description",
        "duration"
    ],

    enrollments: [
        "student_ref",
        "course_ref",
        "year_level",
        "section",
        "school_year",
        "status"
    ]

};


/* ORIGINAL REQUIRED FIELDS */

const required = {

    students: [
        "student_id",
        "full_name",
        "email",
        "status"
    ],

    courses: [
        "course_code",
        "course_name",
        "department",
        "duration"
    ],

    enrollments: [
        ...schemas.enrollments
    ]

};


/* TABLE COLUMNS */

const columns = {

    students: [
        "student_id",
        "full_name",
        "email",
        "status"
    ],

    courses: [
        "course_code",
        "course_name",
        "department",
        "duration"
    ],

    enrollments: [
        ...schemas.enrollments
    ]

};


const modules = {

    dashboard: {

        title: "Dashboard",

        description:
            "Your academic journey, beautifully organized."

    },

    students: {

        title: "Students",

        heading: "Student Directory",

        singular: "Student",

        description:
            "Manage student profiles and academic information.",

        subtitle:
            "Create, view, update and organize student records."

    },

    courses: {

        title: "Courses",

        heading: "Course Catalog",

        singular: "Course",

        description:
            "Discover and manage academic courses and programs.",

        subtitle:
            "Organize course information and academic departments."

    },

    enrollments: {

        title: "Enrollments",

        heading: "Enrollment Records",

        singular: "Enrollment",

        description:
            "Connect students with courses and track their academic journey.",

        subtitle:
            "Manage student enrollments and enrollment status."

    }

};


const enrollmentStatuses = [

    {
        name: "Enrolled",
        color: "#75c5a7"
    },

    {
        name: "Pending",
        color: "#e9b85e"
    },

    {
        name: "Completed",
        color: "#a68add"
    },

    {
        name: "Dropped",
        color: "#e38cae"
    }

];


/* =====================================================
   2. APPLICATION STATE
===================================================== */

let data = {

    students: [],
    courses: [],
    enrollments: []

};

let page = "dashboard";

let editing = null;

let formResource = null;

let formMode = "add";

let busy = false;

let ready = false;

let saving = false;

let deleting = false;

let toastTimer = null;

let viewMode = getPreference(
    "edutrack-view",
    "table"
);

if (!["table", "card"].includes(viewMode)) {
    viewMode = "table";
}

const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);


/* =====================================================
   3. GENERAL HELPERS
===================================================== */

function getPreference(key, fallback) {

    try {

        return localStorage.getItem(key) || fallback;

    } catch {

        return fallback;

    }

}


function savePreference(key, value) {

    try {

        localStorage.setItem(key, value);

    } catch {

        // The application still works
        // when browser storage is unavailable.

    }

}


function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,

        char => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"

        })[char]

    );

}


const esc = escapeHTML;


function icon(name, extraClass = "") {

    return `
        <svg class="icon ${extraClass}"
             aria-hidden="true">

            <use href="#icon-${name}"></use>

        </svg>
    `;

}


function label(field) {

    const customLabels = {

        student_id: "Student ID",

        full_name: "Full Name",

        email: "Email Address",

        birth_date: "Birth Date",

        phone: "Phone Number",

        course_code: "Course Code",

        course_name: "Course Name",

        student_ref: "Student",

        course_ref: "Course",

        year_level: "Year Level",

        school_year: "School Year",

        duration: "Duration (Years)"

    };

    return customLabels[field] ||

        field
            .replace(/_ref$/, "")
            .replaceAll("_", " ")
            .replace(/\b\w/g, char => char.toUpperCase());

}


function initials(name) {

    return String(name || "ET")

        .trim()

        .split(/\s+/)

        .filter(Boolean)

        .slice(0, 2)

        .map(word => word[0].toUpperCase())

        .join("") || "ET";

}


function today() {

    const date = new Date();

    const offset = date.getTimezoneOffset();

    return new Date(
        date.getTime() - offset * 60000
    )

        .toISOString()

        .slice(0, 10);

}


function displayDate() {

    $("currentDate").textContent =

        new Intl.DateTimeFormat("en-US", {

            month: "short",

            day: "numeric",

            year: "numeric"

        }).format(new Date());

}


function recordName(resource, record) {

    if (!record) {
        return "Selected record";
    }

    if (resource === "students") {

        return record.full_name ||
            record.student_id ||
            "Student";

    }

    if (resource === "courses") {

        return record.course_name ||
            record.course_code ||
            "Course";

    }

    return value(record, "student_ref") ||
        "Enrollment";

}


/* =====================================================
   4. FLASK API REQUESTS
===================================================== */

async function api(
    path,
    method = "GET",
    body = undefined
) {

    const headers = {

        "Content-Type": "application/json"

    };

    const response = await fetch(

        `${API}/${path}`,

        {

            method,

            headers,

            ...(body !== undefined
                ? { body: JSON.stringify(body) }
                : {})

        }

    );

    let result;

    try {

        result = await response.json();

    } catch {

        throw new Error(

            `Invalid server response (${response.status}). ` +
            "Please check your Flask application."

        );

    }

    if (!response.ok || !result.success) {

        throw new Error(

            result.message ||

            result.error ||

            `Request failed (${response.status}).`

        );

    }

    return result;

}


/* =====================================================
   5. TOAST NOTIFICATIONS
===================================================== */

function toast(message, type = "success") {

    const element = $("toast");

    const isError = type === "error";

    element.classList.toggle(
        "error",
        isError
    );

    $("toastTitle").textContent =

        isError ? "Something went wrong" : "Success!";

    $("toastMessage").textContent = message;

    $("toastIcon").setAttribute(

        "href",

        isError ? "#icon-alert" : "#icon-check"

    );

    element.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        element.classList.remove("show");

    }, 4000);

}


$("dismissToast").addEventListener("click", () => {

    clearTimeout(toastTimer);

    $("toast").classList.remove("show");

});


/* =====================================================
   6. FIRESTORE CONNECTION INDICATOR
===================================================== */

function setConnection(status) {

    const connection = $("connection");

    connection.classList.remove(
        "online",
        "offline",
        "checking"
    );

    connection.classList.add(status);

    document.body.classList.toggle(
        "firestore-online",
        status === "online"
    );

    const messages = {

        online: "Firestore connected",

        offline: "Connection unavailable",

        checking: "Connecting..."

    };

    $("connectionText").textContent =
        messages[status];

}


/* =====================================================
   7. DARK / LIGHT MODE
===================================================== */

function applyTheme(theme) {

    const dark = theme === "dark";

    document.body.classList.toggle(
        "dark-mode",
        dark
    );

    $("themeIcon").setAttribute(

        "href",

        dark ? "#icon-sun" : "#icon-moon"

    );

    $("themeToggle").setAttribute(

        "aria-label",

        dark
            ? "Switch to light mode"
            : "Switch to dark mode"

    );

    savePreference(
        "edutrack-theme",
        theme
    );

}


function toggleTheme() {

    const dark = document.body.classList.contains(
        "dark-mode"
    );

    applyTheme(dark ? "light" : "dark");

}


$("themeToggle").addEventListener(
    "click",
    toggleTheme
);


/* =====================================================
   8. SIDEBAR NAVIGATION
===================================================== */

function isMobile() {

    return window.matchMedia(
        "(max-width: 800px)"
    ).matches;

}


function updateMenuState() {

    const expanded = isMobile()

        ? document.body.classList.contains(
            "mobile-menu-open"
        )

        : !document.body.classList.contains(
            "sidebar-collapsed"
        );

    $("menu").setAttribute(
        "aria-expanded",
        String(expanded)
    );

}


function closeMobileMenu() {

    document.body.classList.remove(
        "mobile-menu-open"
    );

    updateMenuState();

}


$("menu").addEventListener("click", () => {

    if (isMobile()) {

        document.body.classList.toggle(
            "mobile-menu-open"
        );

    } else {

        document.body.classList.toggle(
            "sidebar-collapsed"
        );

    }

    updateMenuState();

});


$("sidebarOverlay").addEventListener(
    "click",
    closeMobileMenu
);


window.addEventListener("resize", () => {

    if (!isMobile()) {

        document.body.classList.remove(
            "mobile-menu-open"
        );

    }

    updateMenuState();

});


function animatePage(element) {

    element.classList.remove("page-enter");

    void element.offsetWidth;

    element.classList.add("page-enter");

}


function navigate(destination) {

    if (!modules[destination]) {
        return;
    }

    if (saving || deleting) {
        return;
    }

    page = destination;

    document.querySelectorAll(
        "nav [data-page]"
    ).forEach(button => {

        const active =
            button.dataset.page === destination;

        button.classList.toggle(
            "active",
            active
        );

        if (active) {

            button.setAttribute(
                "aria-current",
                "page"
            );

        } else {

            button.removeAttribute(
                "aria-current"
            );

        }

    });

    $("heading").textContent =
        modules[page].title;

    $("pageDescription").textContent =
        modules[page].description;

    $("dashboard").hidden =
        page !== "dashboard";

    $("records").hidden =
        page === "dashboard";

    $("search").value = "";

    closeMobileMenu();

    if (page !== "dashboard") {

        configureModule();

    }

    render();

    animatePage(

        page === "dashboard"

            ? $("dashboard")

            : $("records")

    );

    window.scrollTo({

        top: 0,

        behavior: reduceMotion.matches
            ? "auto"
            : "smooth"

    });

}


function configureModule() {

    const config = modules[page];

    $("moduleBanner").className =
        `module-banner ${page}`;

    $("moduleTitle").textContent =
        config.heading;

    $("moduleDescription").textContent =
        config.description;

    $("moduleIcon").innerHTML =
        icon(page);

    $("recordHeading").textContent =
        config.heading;

    $("recordSubtitle").textContent =
        config.subtitle;

    $("addText").textContent =
        `Add ${config.singular}`;

    $("search").placeholder =
        `Search ${page}...`;

    let statuses = [];

    if (page === "students") {

        statuses = [
            "Active",
            "Inactive"
        ];

    }

    if (page === "enrollments") {

        statuses = [
            "Enrolled",
            "Pending",
            "Completed",
            "Dropped"
        ];

    }

    $("statusFilter").hidden =
        statuses.length === 0;

    $("statusFilter").innerHTML =

        `<option value="">All statuses</option>` +

        statuses.map(status => `

            <option value="${esc(status)}">

                ${esc(status)}

            </option>

        `).join("");

    updateViewButtons();

}


/* =====================================================
   9. LOAD REAL FIRESTORE RECORDS
===================================================== */

async function refresh(showMessage = false) {

    if (busy) {
        return false;
    }

    busy = true;

    $("refresh").disabled = true;

    $("refresh").classList.add("loading");

    setConnection("checking");

    render();

    try {

        const responses = await Promise.all(

            kinds.map(resource => api(resource))

        );

        responses.forEach((response, index) => {

            if (!Array.isArray(response.records)) {

                throw new Error(

                    `Invalid records returned for ${kinds[index]}.`

                );

            }

        });

        kinds.forEach((resource, index) => {

            data[resource] =
                responses[index].records;

        });

        ready = true;

        setConnection("online");

        $("error").hidden = true;

        if (showMessage) {

            toast("Academic records refreshed successfully.");

        }

        return true;

    } catch (error) {

        ready = false;

        setConnection("offline");

        $("error").textContent =

            "Unable to load Firestore records. " +

            error.message;

        $("error").hidden = false;

        if (showMessage) {

            toast(error.message, "error");

        }

        return false;

    } finally {

        busy = false;

        $("refresh").disabled = false;

        $("refresh").classList.remove("loading");

        render();

    }

}


/* =====================================================
   10. RESOLVE STUDENT AND COURSE REFERENCES
===================================================== */

function value(record, field) {

    if (field === "student_ref") {

        const student = data.students.find(

            item => String(item.id) ===
                String(record[field])

        );

        return student?.full_name ||
            record[field] ||
            "";

    }

    if (field === "course_ref") {

        const course = data.courses.find(

            item => String(item.id) ===
                String(record[field])

        );

        return course?.course_code ||
            record[field] ||
            "";

    }

    return record[field] ?? "";

}


function statusPill(status) {

    return `

        <span class="pill"
              data-status="${esc(status)}">

            ${esc(status || "Not specified")}

        </span>

    `;

}


/* =====================================================
   11. MAIN RENDER FUNCTION
===================================================== */

function render() {

    if (page === "dashboard") {

        renderDashboard();

    } else {

        renderRecords();

    }

}


/* =====================================================
   12. DASHBOARD
===================================================== */

function renderDashboard() {

    if (busy && !ready) {

        $("stats").innerHTML =

            Array.from(
                { length: 4 },

                () => `
                    <div class="skeleton skeleton-card"></div>
                `
            ).join("");

        $("overview").innerHTML = `

            <div class="skeleton skeleton-line"></div>

            <div class="skeleton skeleton-line"></div>

            <div class="skeleton skeleton-line"></div>

        `;

        $("recentEnrollments").innerHTML = `

            <div class="skeleton skeleton-line"></div>

            <div class="skeleton skeleton-line"></div>

        `;

        return;

    }

    const stats = [

        {

            title: "Total Students",

            count: data.students.length,

            resource: "students",

            icon: "students",

            color: "lavender"

        },

        {

            title: "Total Courses",

            count: data.courses.length,

            resource: "courses",

            icon: "courses",

            color: "pink"

        },

        {

            title: "Enrollments",

            count: data.enrollments.length,

            resource: "enrollments",

            icon: "enrollments",

            color: "mint"

        },

        {

            title: "Active Enrollments",

            count: data.enrollments.filter(

                record => record.status === "Enrolled"

            ).length,

            resource: "enrollments",

            icon: "users",

            color: "yellow",

            filter: "Enrolled"

        }

    ];

    $("stats").innerHTML = stats.map(stat => `

        <button class="stat-card stat-${stat.color}"
                data-go="${stat.resource}"
                data-filter="${stat.filter || ""}">

            <div class="stat-top">

                <span class="stat-icon">

                    ${icon(stat.icon)}

                </span>

                ${icon("arrow")}

            </div>

            <strong class="stat-number"

                    ${ready
                        ? `data-number="${stat.count}"`
                        : ""}>

                ${ready ? stat.count : "—"}

            </strong>

            <span class="stat-label">

                ${stat.title}

            </span>

            <span class="stat-link">

                View records

                ${icon("arrow")}

            </span>

        </button>

    `).join("");

    if (ready) {

        animateStatistics();

    }

    renderAnalytics();

    renderRecentEnrollments();

}


/* =====================================================
   13. ANIMATED STATISTICS
===================================================== */

function animateStatistics() {

    document.querySelectorAll(
        "[data-number]"
    ).forEach(element => {

        const target = Number(
            element.dataset.number
        );

        if (reduceMotion.matches || target === 0) {

            element.textContent = target;

            return;

        }

        const duration = 750;

        const start = performance.now();

        element.textContent = "0";

        function update(time) {

            if (!element.isConnected) {
                return;
            }

            const progress = Math.min(

                (time - start) / duration,

                1

            );

            const eased =
                1 - Math.pow(1 - progress, 3);

            element.textContent =

                Math.round(
                    target * eased
                ).toLocaleString();

            if (progress < 1) {

                requestAnimationFrame(update);

            }

        }

        requestAnimationFrame(update);

    });

}


/* =====================================================
   14. ENROLLMENT ANALYTICS
===================================================== */

function renderAnalytics() {

    if (!ready) {

        $("overview").innerHTML = `

            <div class="mini-empty">

                ${icon("alert")}

                Enrollment information is unavailable.

            </div>

        `;

        return;

    }

    const total = data.enrollments.length;

    const counts = enrollmentStatuses.map(item => ({

        ...item,

        count: data.enrollments.filter(

            record => record.status === item.name

        ).length

    }));

    let position = 0;

    const segments = [];

    counts.forEach(item => {

        const percentage =
            total ? item.count / total * 100 : 0;

        if (percentage > 0) {

            segments.push(

                `${item.color} ${position}% ` +

                `${position + percentage}%`

            );

        }

        position += percentage;

    });

    if (position < 100) {

        segments.push(

            `var(--border) ${position}% 100%`

        );

    }

    const gradient = total

        ? `conic-gradient(${segments.join(",")})`

        : "var(--border)";

    $("overview").innerHTML = `

        <div class="analytics-summary">

            <div class="donut-chart"
                 style="background:${gradient}">

                <div class="donut-center">

                    <strong>${total}</strong>

                    <small>Enrollments</small>

                </div>

            </div>

            <div>

                <h3>Academic progress</h3>

                <p class="muted">

                    ${total
                        ? "Current distribution of enrollment records."
                        : "Enrollment statistics will appear when records are added."}

                </p>

            </div>

        </div>

        ${counts.map(item => {

            const percentage = total

                ? Math.round(
                    item.count / total * 100
                )

                : 0;

            return `

                <div class="progress-item">

                    <div class="progress-label">

                        <span class="progress-name">

                            <span class="progress-dot"
                                  style="background:${item.color}">
                            </span>

                            ${item.name}

                        </span>

                        <span class="progress-value">

                            ${item.count} records · ${percentage}%

                        </span>

                    </div>

                    <div class="bar"
                         role="progressbar"
                         aria-label="${item.name}"
                         aria-valuemin="0"
                         aria-valuemax="100"
                         aria-valuenow="${percentage}">

                        <span style="
                            width:${percentage}%;
                            background:${item.color};
                        "></span>

                    </div>

                </div>

            `;

        }).join("")}

    `;

}


/* =====================================================
   15. RECENT ENROLLMENTS
===================================================== */

function renderRecentEnrollments() {

    if (!ready) {

        $("recentEnrollments").innerHTML = `

            <div class="mini-empty">

                ${icon("alert")}

                Records unavailable.

            </div>

        `;

        return;

    }

    if (!data.enrollments.length) {

        $("recentEnrollments").innerHTML = `

            <div class="mini-empty">

                ${icon("enrollments")}

                <p>No enrollment records yet.</p>

                <p>Your enrollment records will appear here.</p>

            </div>

        `;

        return;

    }

    const records = [...data.enrollments];

    const hasTimestamps = records.every(

        record => typeof record.created_at === "string" &&

            Number.isFinite(
                Date.parse(record.created_at)
            )

    );

    if (hasTimestamps) {

        records.sort((a, b) =>

            Date.parse(b.created_at) -
            Date.parse(a.created_at)

        );

    }

    // If timestamps are unavailable, preserve
    // the order returned by the original API.

    $("recentEnrollments").innerHTML =

        records.slice(0, 5).map(record => {

            const student =
                value(record, "student_ref");

            const course =
                value(record, "course_ref");

            return `

                <div class="recent-row">

                    <div class="recent-avatar">

                        ${esc(initials(student))}

                    </div>

                    <div class="recent-info">

                        <strong>

                            ${esc(student)}

                        </strong>

                        <small>

                            ${esc(course)}

                            · Year ${esc(record.year_level)}

                            · ${esc(record.section)}

                        </small>

                    </div>

                    ${statusPill(record.status)}

                </div>

            `;

        }).join("");

}


/* =====================================================
   16. SEARCH AND FILTER RECORDS
===================================================== */

function getFilteredRecords() {

    if (!kinds.includes(page)) {
        return [];
    }

    const query = $("search").value

        .trim()

        .toLowerCase();

    const selectedStatus =
        $("statusFilter").value;

    return data[page].filter(record => {

        const matchesStatus =

            !selectedStatus ||

            record.status === selectedStatus;

        const matchesSearch =

            !query ||

            schemas[page].some(field => {

                const resolved = String(

                    value(record, field)

                ).toLowerCase();

                const raw = String(

                    record[field] ?? ""

                ).toLowerCase();

                return resolved.includes(query) ||

                    raw.includes(query);

            });

        return matchesStatus && matchesSearch;

    });

}


/* =====================================================
   17. TABLE / CARD VIEW SWITCHER
===================================================== */

function updateViewButtons() {

    const tableActive = viewMode === "table";

    $("tableView").classList.toggle(
        "active",
        tableActive
    );

    $("cardView").classList.toggle(
        "active",
        !tableActive
    );

    $("tableView").setAttribute(
        "aria-pressed",
        String(tableActive)
    );

    $("cardView").setAttribute(
        "aria-pressed",
        String(!tableActive)
    );

}


function changeView(mode) {

    viewMode = mode;

    savePreference(
        "edutrack-view",
        mode
    );

    updateViewButtons();

    renderRecords();

}


$("tableView").addEventListener(
    "click",
    () => changeView("table")
);


$("cardView").addEventListener(
    "click",
    () => changeView("card")
);


/* =====================================================
   18. RECORD MANAGEMENT RENDERING
===================================================== */

function renderRecords() {

    if (!kinds.includes(page)) {
        return;
    }

    $("add").disabled = !ready || busy;

    $("recordLoading").hidden = true;

    $("emptyState").hidden = true;

    $("tableContainer").hidden = true;

    $("cardContainer").hidden = true;

    if (busy && !ready) {

        $("recordLoading").hidden = false;

        $("count").textContent = "Loading records...";

        return;

    }

    if (!ready) {

        showEmptyState("offline");

        $("count").textContent = "Records unavailable";

        return;

    }

    const records = getFilteredRecords();

    $("count").textContent =

        `${records.length} of ${data[page].length} records`;

    if (!records.length) {

        const filtering =

            $("search").value.trim() ||

            $("statusFilter").value;

        showEmptyState(

            filtering ? "search" : "empty"

        );

        return;

    }

    if (viewMode === "table") {

        $("tableContainer").hidden = false;

        renderTable(records);

    } else {

        $("cardContainer").hidden = false;

        renderCards(records);

    }

}


/* =====================================================
   19. EMPTY STATES
===================================================== */

function showEmptyState(type) {

    $("emptyState").hidden = false;

    const singular = modules[page].singular;

    if (type === "offline") {

        $("emptyTitle").textContent =
            "Connection unavailable";

        $("emptyMessage").textContent =

            "Unable to retrieve records from Firestore. " +

            "Please check your connection and try again.";

        $("emptyAction").textContent =
            "Try again";

        $("emptyAction").onclick =
            () => refresh(true);

        return;

    }

    if (type === "search") {

        $("emptyTitle").textContent =
            "No matching records";

        $("emptyMessage").textContent =

            "Try a different keyword or clear your filters.";

        $("emptyAction").textContent =
            "Clear filters";

        $("emptyAction").onclick = () => {

            $("search").value = "";

            $("statusFilter").value = "";

            renderRecords();

        };

        return;

    }

    $("emptyTitle").textContent =
        `No ${page} yet`;

    $("emptyMessage").textContent =

        `Start building your campus by adding your first ` +

        `${singular.toLowerCase()} record.`;

    $("emptyAction").textContent =
        `Add first ${singular.toLowerCase()}`;

    $("emptyAction").onclick =
        () => openForm(null, "add");

}


/* =====================================================
   20. CRUD ACTION BUTTONS
===================================================== */

function actionButtons(record) {

    const id = esc(record.id);

    return `

        <button class="button button-view button-small"
                data-view="${id}"
                title="View record">

            ${icon("view")}

            View

        </button>

        <button class="button button-edit button-small"
                data-edit="${id}"
                title="Edit record">

            ${icon("edit")}

            Edit

        </button>

        <button class="button button-delete button-small"
                data-delete="${id}"
                title="Delete record">

            ${icon("delete")}

            Delete

        </button>

    `;

}


/* =====================================================
   21. TABLE VIEW
===================================================== */

function renderTable(records) {

    const fields = columns[page];

    $("thead").innerHTML = `

        <tr>

            ${fields.map(field => `

                <th>${esc(label(field))}</th>

            `).join("")}

            <th>Actions</th>

        </tr>

    `;

    $("tbody").innerHTML = records.map(record => `

        <tr>

            ${fields.map(field => {

                const fieldValue =
                    value(record, field);

                if (field === "status") {

                    return `

                        <td>

                            ${statusPill(fieldValue)}

                        </td>

                    `;

                }

                if (field === "full_name" ||

                    field === "student_ref") {

                    return `

                        <td>

                            <div class="table-person">

                                <span class="table-avatar">

                                    ${esc(initials(fieldValue))}

                                </span>

                                <strong>

                                    ${esc(fieldValue || "—")}

                                </strong>

                            </div>

                        </td>

                    `;

                }

                return `

                    <td>

                        ${esc(
                            fieldValue === ""
                                ? "—"
                                : fieldValue
                        )}

                    </td>

                `;

            }).join("")}

            <td>

                <div class="table-actions">

                    ${actionButtons(record)}

                </div>

            </td>

        </tr>

    `).join("");

}


/* =====================================================
   22. CARD VIEW
===================================================== */

function renderCards(records) {

    $("cardContainer").innerHTML =

        records.map((record, index) => {

            let title = "";

            let code = "";

            let avatar = "";

            let details = [];

            if (page === "students") {

                title = record.full_name;

                code = record.student_id;

                avatar = esc(
                    initials(record.full_name)
                );

                details = [

                    ["Email", record.email],

                    ["Phone", record.phone],

                    ["Gender", record.gender]

                ];

            } else if (page === "courses") {

                title = record.course_name;

                code = record.course_code;

                avatar = icon("courses");

                details = [

                    ["Department", record.department],

                    [
                        "Duration",

                        record.duration === undefined ||
                        record.duration === ""

                            ? ""

                            : `${record.duration} year(s)`
                    ],

                    ["Description", record.description]

                ];

            } else {

                title = value(
                    record,
                    "student_ref"
                );

                code = value(
                    record,
                    "course_ref"
                );

                avatar = icon("enrollments");

                details = [

                    ["Year Level", record.year_level],

                    ["Section", record.section],

                    ["School Year", record.school_year]

                ];

            }

            return `

                <article class="record-card"
                         style="animation-delay:${Math.min(index, 8) * .04}s">

                    <div class="record-card-cover cover-${index % 5}">

                        <div class="record-card-avatar">

                            ${avatar}

                        </div>

                    </div>

                    <div class="record-card-body">

                        <span class="record-card-code">

                            ${esc(code || "ACADEMIC RECORD")}

                        </span>

                        <h3>

                            ${esc(title || "Untitled record")}

                        </h3>

                        ${record.status
                            ? statusPill(record.status)
                            : ""}

                        <div class="record-card-details">

                            ${details.map(([name, detail]) => `

                                <div class="card-detail">

                                    <small>

                                        ${esc(name)}

                                    </small>

                                    <span>

                                        ${esc(
                                            detail === undefined ||
                                            detail === null ||
                                            detail === ""

                                                ? "—"

                                                : detail
                                        )}

                                    </span>

                                </div>

                            `).join("")}

                        </div>

                        <div class="record-card-actions">

                            ${actionButtons(record)}

                        </div>

                    </div>

                </article>

            `;

        }).join("");

}


/* =====================================================
   23. FORM FIELD OPTIONS
===================================================== */

function getFieldOptions(resource) {

    return {

        gender: [

            "Female",

            "Male",

            "Other",

            "Prefer not to say"

        ],

        status: resource === "students"

            ? [
                "Active",
                "Inactive"
            ]

            : [
                "Enrolled",
                "Pending",
                "Completed",
                "Dropped"
            ],

        student_ref: data.students.map(student => [

            student.id,

            `${student.full_name} · ${student.student_id}`

        ]),

        course_ref: data.courses.map(course => [

            course.id,

            `${course.course_code} · ${course.course_name}`

        ]),

        year_level: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6"
        ]

    };

}


/* =====================================================
   24. ADD / EDIT / VIEW MODAL
===================================================== */

function openForm(id = null, mode = "add") {

    if (!ready || busy || saving || deleting) {
        return;
    }

    if (!kinds.includes(page)) {
        return;
    }

    formResource = page;

    formMode = mode;

    editing = id;

    const existing = id

        ? data[formResource].find(

            item => String(item.id) === String(id)

        )

        : null;

    if (id && !existing) {

        toast("Record not found.", "error");

        return;

    }

    const record = existing || {};

    if (mode === "add" && formResource === "enrollments") {

        if (!data.students.length || !data.courses.length) {

            toast(

                "Add at least one student and one course before creating an enrollment.",

                "error"

            );

            return;

        }

    }

    const singular =
        modules[formResource].singular;

    const viewing = mode === "view";

    const title =

        mode === "view"

            ? `${singular} Details`

            : mode === "edit"

                ? `Edit ${singular}`

                : `Add New ${singular}`;

    $("modalTitle").textContent = title;

    $("modalDescription").textContent =

        viewing

            ? "View the complete information for this record."

            : mode === "edit"

                ? "Update the information below and save your changes."

                : "Complete the required information to create a record.";

    $("modalIcon").setAttribute(

        "href",

        viewing

            ? "#icon-view"

            : mode === "edit"

                ? "#icon-edit"

                : "#icon-plus"

    );

    $("save").hidden = viewing;

    $("save").disabled = false;

    $("saveText").textContent =

        mode === "edit"

            ? "Save changes"

            : "Save record";

    $("cancelText").textContent =

        viewing ? "Close" : "Cancel";

    $("formError").hidden = true;

    $("formError").textContent = "";

    const options =
        getFieldOptions(formResource);

    $("fields").innerHTML =

        schemas[formResource].map(field => {

            if (viewing) {

                return `

                    <div class="form-field">

                        <span>

                            ${esc(label(field))}

                        </span>

                        <div class="field-value">

                            ${field === "status"

                                ? statusPill(record[field])

                                : esc(
                                    value(record, field) === ""

                                        ? "—"

                                        : value(record, field)
                                )

                            }

                        </div>

                    </div>

                `;

            }

            return createFormField(

                formResource,

                field,

                record,

                options

            );

        }).join("");

    $("modal").showModal();

}


/* =====================================================
   25. GENERATE FORM FIELDS
===================================================== */

function createFormField(
    resource,
    field,
    record,
    options
) {

    const isRequired =
        required[resource].includes(field);

    const requiredAttribute =

        isRequired ? "required" : "";

    let currentValue =
        record[field] ?? "";

    if (formMode === "add") {

        if (field === "status") {

            currentValue =

                resource === "students"

                    ? "Active"

                    : "Enrolled";

        }

    }

    let input = "";

    if (options[field]) {

        const fieldOptions = [...options[field]];

        const containsCurrent = fieldOptions.some(option => {

            const optionValue = Array.isArray(option)

                ? option[0]

                : option;

            return String(optionValue) ===
                String(currentValue);

        });

        // Preserve existing values that are not
        // present in the current dropdown options.

        if (currentValue !== "" && !containsCurrent) {

            fieldOptions.push([

                currentValue,

                `${currentValue} (existing value)`

            ]);

        }

        input = `

            <select name="${field}"
                    ${requiredAttribute}>

                <option value="">

                    Select ${esc(label(field))}

                </option>

                ${fieldOptions.map(option => {

                    const [optionValue, optionText] =

                        Array.isArray(option)

                            ? option

                            : [option, option];

                    return `

                        <option value="${esc(optionValue)}"

                            ${String(currentValue) ===
                              String(optionValue)

                                ? "selected"

                                : ""}>

                            ${esc(optionText)}

                        </option>

                    `;

                }).join("")}

            </select>

        `;

    } else if (

        field === "description" ||

        field === "address"

    ) {

        input = `

            <textarea name="${field}"
                      rows="3"
                      placeholder="Enter ${esc(label(field).toLowerCase())}"
                      ${requiredAttribute}>${esc(currentValue)}</textarea>

        `;

    } else {

        const types = {

            email: "email",

            birth_date: "date",

            duration: "number",

            phone: "tel"

        };

        const type =
            types[field] || "text";

        let extra = "";

        if (field === "duration") {

            extra = 'min="1" max="12" step="1"';

        }

        if (field === "birth_date") {

            extra = `max="${today()}"`;

        }

        input = `

            <input name="${field}"

                   type="${type}"

                   value="${esc(currentValue)}"

                   placeholder="Enter ${esc(label(field).toLowerCase())}"

                   ${extra}

                   ${requiredAttribute}>

        `;

    }

    const fullWidth =

        field === "description" ||

        field === "address";

    return `

        <label class="form-field ${fullWidth ? "full-width" : ""}">

            <span>

                ${esc(label(field))}

                ${isRequired

                    ? '<span class="required-star">*</span>'

                    : ""}

            </span>

            ${input}

        </label>

    `;

}


/* =====================================================
   26. CLIENT-SIDE VALIDATION
===================================================== */

function validateForm(resource, payload) {

    for (const field of required[resource]) {

        if (!String(payload[field] ?? "").trim()) {

            throw new Error(

                `${label(field)} is required.`

            );

        }

    }

    if (resource === "students") {

        const email = payload.email || "";

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            throw new Error(

                "Please enter a valid email address."

            );

        }

        if (

            payload.birth_date &&

            payload.birth_date > today()

        ) {

            throw new Error(

                "Birth date cannot be in the future."

            );

        }

        if (!["Active", "Inactive"].includes(payload.status)) {

            throw new Error(

                "Please select a valid student status."

            );

        }

    }

    if (resource === "courses") {

        const duration = Number(payload.duration);

        if (

            !Number.isInteger(duration) ||

            duration < 1 ||

            duration > 12

        ) {

            throw new Error(

                "Course duration must be between 1 and 12 years."

            );

        }

    }

    if (resource === "enrollments") {

        const studentExists = data.students.some(

            student => String(student.id) ===

                String(payload.student_ref)

        );

        const courseExists = data.courses.some(

            course => String(course.id) ===

                String(payload.course_ref)

        );

        if (!studentExists) {

            throw new Error(

                "Please select an existing student."

            );

        }

        if (!courseExists) {

            throw new Error(

                "Please select an existing course."

            );

        }

        if (!["1", "2", "3", "4", "5", "6"].includes(

            String(payload.year_level)

        )) {

            throw new Error(

                "Please select a valid year level."

            );

        }

        if (!enrollmentStatuses.some(

            item => item.name === payload.status

        )) {

            throw new Error(

                "Please select a valid enrollment status."

            );

        }

    }

}


/* =====================================================
   27. CREATE AND UPDATE RECORDS
===================================================== */

$("form").addEventListener("submit", async event => {

    event.preventDefault();

    if (saving || formMode === "view") {
        return;
    }

    const resource = formResource;

    const recordId = editing;

    const payload = Object.fromEntries(

        new FormData(event.target)

    );

    // Keep the original form payload structure.
    // Values are sent as strings, as in the original app.

    Object.keys(payload).forEach(key => {

        if (typeof payload[key] === "string") {

            payload[key] = payload[key].trim();

        }

    });

    $("formError").hidden = true;

    try {

        validateForm(resource, payload);

    } catch (error) {

        $("formError").textContent =
            error.message;

        $("formError").hidden = false;

        return;

    }

    saving = true;

    $("save").disabled = true;

    $("cancel").disabled = true;

    $("close").disabled = true;

    $("save").classList.add("loading");

    $("saveText").textContent =

        recordId ? "Updating..." : "Saving...";

    try {

        const path = recordId

            ? `${resource}/${encodeURIComponent(recordId)}`

            : resource;

        const method =
            recordId ? "PUT" : "POST";

        await api(

            path,

            method,

            payload

        );

        $("modal").close();

        const updated = await refresh();

        if (updated) {

            toast(

                recordId

                    ? "Record updated successfully."

                    : "Record added successfully."

            );

        } else {

            toast(

                "Record saved, but refreshing the list failed. Please refresh again.",

                "error"

            );

        }

    } catch (error) {

        $("formError").textContent =
            error.message;

        $("formError").hidden = false;

    } finally {

        saving = false;

        $("save").disabled = false;

        $("cancel").disabled = false;

        $("close").disabled = false;

        $("save").classList.remove("loading");

        $("saveText").textContent =

            recordId ? "Save changes" : "Save record";

    }

});


/* =====================================================
   28. CLOSE FORM MODAL
===================================================== */

function closeForm() {

    if (!saving) {

        $("modal").close();

    }

}


$("close").addEventListener(
    "click",
    closeForm
);


$("cancel").addEventListener(
    "click",
    closeForm
);


$("modal").addEventListener("cancel", event => {

    if (saving) {

        event.preventDefault();

    }

});


/* =====================================================
   29. DELETE CONFIRMATION
===================================================== */

function confirmDelete(resource, record) {

    return new Promise(resolve => {

        const dialog = $("confirmDialog");

        const name = recordName(
            resource,
            record
        );

        $("deleteMessage").textContent =

            `Are you sure you want to delete "${name}"? ` +

            "This record will be permanently removed from Firestore.";

        dialog.returnValue = "cancel";

        $("keep").onclick = () => {

            dialog.close("cancel");

        };

        $("remove").onclick = () => {

            dialog.close("delete");

        };

        dialog.addEventListener(

            "close",

            () => {

                resolve(
                    dialog.returnValue === "delete"
                );

            },

            { once: true }

        );

        dialog.showModal();

    });

}


/* =====================================================
   30. DELETE RECORD
===================================================== */

async function deleteRecord(id, button) {

    if (!ready || busy || deleting || saving) {
        return;
    }

    const resource = page;

    const record = data[resource].find(

        item => String(item.id) === String(id)

    );

    if (!record) {

        toast("Record not found.", "error");

        return;

    }

    deleting = true;

    try {

        const confirmed = await confirmDelete(

            resource,

            record

        );

        if (!confirmed) {
            return;
        }

        button.disabled = true;

        button.classList.add("loading");

        await api(

            `${resource}/${encodeURIComponent(id)}`,

            "DELETE"

        );

        const updated = await refresh();

        if (updated) {

            toast("Record deleted successfully.");

        } else {

            toast(

                "Record deleted, but the list could not be refreshed.",

                "error"

            );

        }

    } catch (error) {

        toast(

            error.message,

            "error"

        );

    } finally {

        deleting = false;

        button.disabled = false;

        button.classList.remove("loading");

    }

}


/* =====================================================
   31. RECORD ACTION EVENT DELEGATION
===================================================== */

function handleRecordAction(event) {

    const button = event.target.closest(

        "[data-view], [data-edit], [data-delete]"

    );

    if (!button || !ready) {
        return;
    }

    if (button.hasAttribute("data-view")) {

        openForm(

            button.dataset.view,

            "view"

        );

    } else if (button.hasAttribute("data-edit")) {

        openForm(

            button.dataset.edit,

            "edit"

        );

    } else if (button.hasAttribute("data-delete")) {

        deleteRecord(

            button.dataset.delete,

            button

        );

    }

}


$("tbody").addEventListener(

    "click",

    handleRecordAction

);


$("cardContainer").addEventListener(

    "click",

    handleRecordAction

);


/* =====================================================
   32. GLOBAL BUTTON RIPPLE EFFECT
===================================================== */

document.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (

        !button ||

        button.disabled ||

        reduceMotion.matches

    ) {

        return;

    }

    const rect = button.getBoundingClientRect();

    const ripple = document.createElement("span");

    ripple.className = "ripple";

    const x = event.detail === 0

        ? rect.width / 2

        : event.clientX - rect.left;

    const y = event.detail === 0

        ? rect.height / 2

        : event.clientY - rect.top;

    ripple.style.left = `${x - 6}px`;

    ripple.style.top = `${y - 6}px`;

    button.appendChild(ripple);

    setTimeout(() => {

        ripple.remove();

    }, 650);

}, true);


/* =====================================================
   33. NAVIGATION EVENT LISTENERS
===================================================== */

document.querySelectorAll(

    "nav [data-page]"

).forEach(button => {

    button.addEventListener("click", () => {

        navigate(button.dataset.page);

    });

});


document.querySelectorAll(

    "[data-jump]"

).forEach(button => {

    button.addEventListener("click", () => {

        navigate(button.dataset.jump);

    });

});


$("explore").addEventListener("click", () => {

    navigate("students");

});


$("stats").addEventListener("click", event => {

    const button = event.target.closest("[data-go]");

    if (!button) {
        return;
    }

    navigate(button.dataset.go);

    if (button.dataset.filter && page === button.dataset.go) {

        $("statusFilter").value =
            button.dataset.filter;

        renderRecords();

    }

});


/* =====================================================
   34. SEARCH, FILTER AND REFRESH EVENTS
===================================================== */

$("search").addEventListener("input", () => {

    renderRecords();

});


$("statusFilter").addEventListener("change", () => {

    renderRecords();

});


$("add").addEventListener("click", () => {

    openForm(null, "add");

});


$("refresh").addEventListener("click", () => {

    refresh(true);

});


document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeMobileMenu();

    }

});


/* =====================================================
   35. INITIALIZE APPLICATION
===================================================== */

function initialize() {

    const savedTheme = getPreference(

        "edutrack-theme",

        "light"

    );

    applyTheme(

        savedTheme === "dark"

            ? "dark"

            : "light"

    );

    displayDate();

    updateMenuState();

    updateViewButtons();

    navigate("dashboard");

    refresh();

}


initialize();
