let state = {
  settings: {},
  students: [],
  payments: [],
  history: [],
};

const pageContent = document.getElementById("pageContent");

const pageTitle = document.getElementById("pageTitle");

const pageSubtitle = document.getElementById("pageSubtitle");

const modalOverlay = document.getElementById("modalOverlay");

const modal = document.getElementById("modal");

const toast = document.getElementById("toast");

/* =========================
API
========================= */

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

/* =========================
LOAD DATA
========================= */

async function loadData() {
  state = await api("/api/data");

  document.getElementById("brandName").textContent = state.settings.libraryName;

  document.getElementById("topAdmin").textContent = state.settings.adminName;

  document.getElementById("sideAdmin").textContent = state.settings.adminName;

  const letter = state.settings.adminName.charAt(0).toUpperCase();

  document.getElementById("topAvatar").textContent = letter;

  showPage("dashboard");
}

/* =========================
MENU
========================= */

document.querySelectorAll(".menu-item").forEach((button) => {
  button.addEventListener("click", () => {
    activateMenu(button.dataset.page);
  });
});

function activateMenu(page) {
  document.querySelectorAll(".menu-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  showPage(page);
}

/* =========================
PAGE
========================= */

function showPage(page) {
  const titles = {
    dashboard: ["Dashboard", "Overview of your library"],

    seats: ["Seats", "Manage all 120 library seats"],

    students: ["Students", "Manage current students"],

    fees: ["Fees", "Track monthly fee payments"],

    records: ["Records", "Complete library activity history"],

    settings: ["Settings", "Library and administrator settings"],
  };

  pageTitle.textContent = titles[page][0];

  pageSubtitle.textContent = titles[page][1];

  if (page === "dashboard") renderDashboard();

  if (page === "seats") renderSeats();

  if (page === "students") renderStudents();

  if (page === "fees") renderFees();

  if (page === "records") renderRecords();

  if (page === "settings") renderSettings();
}

/* =========================
HELPERS
========================= */

function money(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function dateText(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function seatStudent(seat) {
  return state.students.find(
    (student) => student.seat === seat && student.status === "active",
  );
}

function isPaidThisMonth(studentId) {
  const month = new Date().toISOString().slice(0, 7);

  return state.payments.some(
    (payment) => payment.studentId === studentId && payment.month === month,
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function getActiveStudents() {
  return state.students.filter((student) => student.status === "active");
}

function getLeftStudents() {
  return state.students.filter((student) => student.status === "left");
}

function getEmptySeats() {
  let count = 0;

  for (let seat = 1; seat <= 120; seat++) {
    if (!seatStudent(seat)) count++;
  }

  return count;
}

/* =========================
DASHBOARD
========================= */

function renderDashboard() {
  const active = getActiveStudents();

  const empty = getEmptySeats();

  const paid = active.filter((student) => isPaidThisMonth(student.id)).length;

  const pending = active.length - paid;

  pageContent.innerHTML = `

        <div class="cards">

            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Total Seats
                    </div>

                    <div class="stat-value">
                        120
                    </div>

                </div>

                <div class="stat-icon">
                    💺
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Occupied Seats
                    </div>

                    <div class="stat-value">
                        ${active.length}
                    </div>

                </div>

                <div class="stat-icon">
                    👥
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Empty Seats
                    </div>

                    <div class="stat-value">
                        ${empty}
                    </div>

                </div>

                <div class="stat-icon">
                    🪑
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Fee Pending
                    </div>

                    <div class="stat-value">
                        ${pending}
                    </div>

                </div>

                <div class="stat-icon">
                    💰
                </div>

            </div>

        </div>


        <div class="grid-2">

            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Seat Overview
                        </div>

                        <div class="section-subtitle">
                            Click a seat to view student details
                        </div>

                    </div>

                    <button
                        class="btn btn-primary"
                        onclick="activateMenu('seats')"
                    >
                        View All
                    </button>

                </div>


                ${seatGridHTML(60)}


                <div class="legend">

                    <div class="legend-item">
                        <span class="dot empty"></span>
                        Empty
                    </div>

                    <div class="legend-item">
                        <span class="dot paid"></span>
                        Fee Paid
                    </div>

                    <div class="legend-item">
                        <span class="dot pending"></span>
                        Fee Pending
                    </div>

                </div>

            </div>


            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Recent Activity
                        </div>

                        <div class="section-subtitle">
                            Latest library updates
                        </div>

                    </div>

                </div>


                ${activityHTML(7)}

            </div>

        </div>

    `;
}

/* =========================
SEAT GRID
========================= */

function seatGridHTML(limit = 120) {
  let html = "";

  for (let seat = 1; seat <= limit; seat++) {
    const student = seatStudent(seat);

    let className = "seat empty";

    let name = "EMPTY";

    if (student) {
      const paid = isPaidThisMonth(student.id);

      className = paid ? "seat occupied" : "seat pending";

      name = student.name;
    }

    html += `

            <button
                class="${className}"
                onclick="seatClicked(${seat})"
            >

                <strong>
                    ${String(seat).padStart(2, "0")}
                </strong>

                <small>
                    ${escapeHtml(name)}
                </small>

            </button>

        `;
  }

  return `
        <div class="seat-grid">
            ${html}
        </div>
    `;
}

/* =========================
SEAT CLICK
========================= */

function seatClicked(seat) {
  const student = seatStudent(seat);

  if (student) {
    openStudentDetails(student.id);
  } else {
    openStudentForm(seat);
  }
}

/* =========================
SEATS PAGE
========================= */

function renderSeats() {
  pageContent.innerHTML = `

        <div class="section">

            <div class="section-header">

                <div>

                    <div class="section-title">
                        All 120 Seats
                    </div>

                    <div class="section-subtitle">
                        Green = paid, orange = pending, grey = empty
                    </div>

                </div>

                <button
                    class="btn btn-primary"
                    onclick="openStudentForm()"
                >
                    + Add Student
                </button>

            </div>


            ${seatGridHTML(120)}


            <div class="legend">

                <div class="legend-item">
                    <span class="dot empty"></span>
                    Empty
                </div>

                <div class="legend-item">
                    <span class="dot paid"></span>
                    Fee Paid
                </div>

                <div class="legend-item">
                    <span class="dot pending"></span>
                    Fee Pending
                </div>

            </div>

        </div>

    `;
}

/* =========================
STUDENTS PAGE
========================= */

function renderStudents(search = "") {
  const active = getActiveStudents();

  const q = search.trim().toLowerCase();

  const students = active.filter(
    (student) =>
      !q ||
      student.name.toLowerCase().includes(q) ||
      String(student.seat).includes(q) ||
      student.mobile.includes(q),
  );

  pageContent.innerHTML = `

        <div class="section">

            <div class="toolbar">

                <input
                    class="search"
                    id="studentSearch"
                    placeholder="Search student, seat or mobile..."
                    value="${escapeAttr(search)}"
                >


                <button
                    class="btn btn-primary"
                    onclick="openStudentForm()"
                >
                    + Add Student
                </button>

            </div>


            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>Seat</th>

                            <th>Student</th>

                            <th>Mobile</th>

                            <th>Joining</th>

                            <th>Fee</th>

                            <th>Status</th>

                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                          students.length
                            ? students.map(studentRowHTML).join("")
                            : `
                                    <tr>
                                        <td
                                            colspan="7"
                                            class="empty-state"
                                        >
                                            No students found.
                                        </td>
                                    </tr>
                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;

  const searchBox = document.getElementById("studentSearch");

  searchBox.addEventListener("input", (event) => {
    renderStudents(event.target.value);
  });
}

/* =========================
STUDENT ROW
========================= */

function studentRowHTML(student) {
  const paid = isPaidThisMonth(student.id);

  return `

        <tr>

            <td>
                <strong>
                    ${String(student.seat).padStart(2, "0")}
                </strong>
            </td>


            <td>

                <strong>
                    ${escapeHtml(student.name)}
                </strong>

                ${
                  student.course
                    ? `
                            <div
                                style="
                                    color:#6b7280;
                                    font-size:9px;
                                    margin-top:3px;
                                "
                            >
                                ${escapeHtml(student.course)}
                            </div>
                        `
                    : ""
                }

            </td>


            <td>
                ${escapeHtml(student.mobile || "-")}
            </td>


            <td>
                ${dateText(student.joiningDate)}
            </td>


            <td>
                ${money(student.fee)}
            </td>


            <td>

                <span
                    class="badge ${paid ? "badge-paid" : "badge-pending"}"
                >
                    ${paid ? "PAID" : "PENDING"}
                </span>

            </td>


            <td>

                <button
                    class="btn btn-light"
                    onclick="openStudentDetails('${student.id}')"
                >
                    View
                </button>

            </td>

        </tr>

    `;
}

/* =========================
FEES
========================= */

function renderFees() {
  const active = getActiveStudents();

  const paid = active.filter((student) => isPaidThisMonth(student.id));

  const pending = active.filter((student) => !isPaidThisMonth(student.id));

  const totalCollected = state.payments
    .filter((payment) => payment.month === new Date().toISOString().slice(0, 7))
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  pageContent.innerHTML = `

        <div class="cards">

            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Paid This Month
                    </div>

                    <div class="stat-value">
                        ${paid.length}
                    </div>

                </div>

                <div class="stat-icon">
                    ✅
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Pending
                    </div>

                    <div class="stat-value">
                        ${pending.length}
                    </div>

                </div>

                <div class="stat-icon">
                    ⏳
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Collected This Month
                    </div>

                    <div class="stat-value">
                        ${money(totalCollected)}
                    </div>

                </div>

                <div class="stat-icon">
                    💵
                </div>

            </div>


            <div class="card stat-card">

                <div>

                    <div class="stat-label">
                        Total Payments
                    </div>

                    <div class="stat-value">
                        ${state.payments.length}
                    </div>

                </div>

                <div class="stat-icon">
                    🧾
                </div>

            </div>

        </div>


        <div class="section">

            <div class="section-header">

                <div>

                    <div class="section-title">
                        Current Month Fees
                    </div>

                    <div class="section-subtitle">
                        Mark a student's monthly payment
                    </div>

                </div>

            </div>


            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>Seat</th>

                            <th>Student</th>

                            <th>Monthly Fee</th>

                            <th>Status</th>

                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                          active.length
                            ? active
                                .map((student) => {
                                  const isPaid = isPaidThisMonth(student.id);

                                  return `

                                            <tr>

                                                <td>
                                                    ${student.seat}
                                                </td>

                                                <td>
                                                    <strong>
                                                        ${escapeHtml(
                                                          student.name,
                                                        )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    ${money(student.fee)}
                                                </td>

                                                <td>

                                                    <span
                                                        class="badge ${
                                                          isPaid
                                                            ? "badge-paid"
                                                            : "badge-pending"
                                                        }"
                                                    >
                                                        ${
                                                          isPaid
                                                            ? "PAID"
                                                            : "PENDING"
                                                        }
                                                    </span>

                                                </td>

                                                <td>

                                                    ${
                                                      isPaid
                                                        ? `
                                                            <button
                                                                class="btn btn-light"
                                                                onclick="showStudentPayments('${student.id}')"
                                                            >
                                                                History
                                                            </button>
                                                        `
                                                        : `
                                                            <button
                                                                class="btn btn-success"
                                                                onclick="openPaymentForm('${student.id}')"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        `
                                                    }

                                                </td>

                                            </tr>

                                        `;
                                })
                                .join("")
                            : `
                                    <tr>
                                        <td
                                            colspan="5"
                                            class="empty-state"
                                        >
                                            No active students.
                                        </td>
                                    </tr>
                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;
}

/* =========================
RECORDS
========================= */

function renderRecords() {
  const left = getLeftStudents();

  pageContent.innerHTML = `

        <div class="grid-2">

            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Activity History
                        </div>

                        <div class="section-subtitle">
                            Every important action is recorded
                        </div>

                    </div>

                </div>


                ${activityHTML(100)}

            </div>


            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Students Who Left
                        </div>

                        <div class="section-subtitle">
                            Their records remain saved
                        </div>

                    </div>

                </div>


                ${
                  left.length
                    ? left
                        .map(
                          (student) => `

                                <div
                                    class="detail-box"
                                    style="margin-bottom:8px"
                                >

                                    <strong>
                                        ${escapeHtml(student.name)}
                                    </strong>

                                    <div
                                        style="
                                            color:#6b7280;
                                            font-size:9px;
                                            margin-top:4px;
                                        "
                                    >
                                        Seat ${student.seat}
                                        · Left
                                        ${dateText(student.leftDate)}
                                    </div>

                                </div>

                            `,
                        )
                        .join("")
                    : `
                            <div class="empty-state">
                                No previous students.
                            </div>
                        `
                }

            </div>

        </div>

    `;
}

/* =========================
ACTIVITY
========================= */

function activityHTML(limit) {
  const list = state.history.slice(0, limit);

  if (!list.length) {
    return `
            <div class="empty-state">
                No activity yet.
            </div>
        `;
  }

  return `

        <div class="activity">

            ${list
              .map((item) => {
                let icon = "📌";

                if (item.type === "joined") icon = "👤";

                if (item.type === "payment") icon = "💰";

                if (item.type === "left") icon = "🚪";

                if (item.type === "updated") icon = "✏️";

                return `

                            <div
                                class="activity-item"
                            >

                                <div
                                    class="activity-icon"
                                >
                                    ${icon}
                                </div>


                                <div>

                                    <strong>
                                        ${escapeHtml(item.note)}
                                    </strong>

                                    <span>
                                        ${dateText(item.date)}
                                        ${
                                          item.seat
                                            ? ` · Seat ${item.seat}`
                                            : ""
                                        }
                                    </span>

                                </div>

                            </div>

                        `;
              })
              .join("")}

        </div>

    `;
}

/* =========================
ADD / EDIT STUDENT
========================= */

function openStudentForm(selectedSeat = null, existingId = null) {
  const existing = existingId
    ? state.students.find((s) => s.id === existingId)
    : null;

  let seat = existing ? existing.seat : selectedSeat || findEmptySeat();

  openModal(`

        <div class="modal-header">

            <div>

                <h2>
                    ${existing ? "Edit Student" : "Add Student"}
                </h2>

                <p>
                    ${
                      existing
                        ? "Update student details"
                        : "Add a new library member"
                    }
                </p>

            </div>


            <button
                class="close-btn"
                onclick="closeModal()"
            >
                ✕
            </button>

        </div>


        <form id="studentForm">

            <div class="form-grid">


                <div class="form-group">

                    <label>
                        Student Name
                    </label>

                    <input
                        name="name"
                        value="${escapeAttr(existing?.name || "")}"
                        placeholder="Enter student name"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Seat Number
                    </label>

                    <input
                        name="seat"
                        type="number"
                        min="1"
                        max="120"
                        value="${seat}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Mobile Number
                    </label>

                    <input
                        name="mobile"
                        value="${escapeAttr(existing?.mobile || "")}"
                        placeholder="10 digit mobile"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Joining Date
                    </label>

                    <input
                        name="joiningDate"
                        type="date"
                        value="${escapeAttr(
                          existing?.joiningDate ||
                            new Date().toISOString().slice(0, 10),
                        )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Monthly Fee
                    </label>

                    <input
                        name="fee"
                        type="number"
                        min="0"
                        value="${
                          existing?.fee ?? state.settings.monthlyFeeDefault
                        }"
                    >

                </div>


                <div class="form-group full">

                    <label>
                        Course / Batch
                    </label>

                    <input
                        name="course"
                        value="${escapeAttr(existing?.course || "")}"
                        placeholder="Example: Morning Batch"
                    >

                </div>


            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-light"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    ${existing ? "Save Changes" : "Add Student"}
                </button>

            </div>

        </form>

    `);

  document
    .getElementById("studentForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = new FormData(event.target);

      const payload = {
        name: form.get("name"),

        seat: Number(form.get("seat")),

        mobile: form.get("mobile"),

        joiningDate: form.get("joiningDate"),

        fee: Number(form.get("fee")),

        course: form.get("course"),
      };

      try {
        if (existing) {
          await api(`/api/students/${existing.id}`, {
            method: "PUT",

            body: JSON.stringify(payload),
          });

          showToast("Student updated.");
        } else {
          await api("/api/students", {
            method: "POST",

            body: JSON.stringify(payload),
          });

          showToast("Student added.");
        }

        closeModal();

        await loadData();

        activateMenu("students");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
}

/* =========================
EMPTY SEAT
========================= */

function findEmptySeat() {
  for (let seat = 1; seat <= 120; seat++) {
    if (!seatStudent(seat)) return seat;
  }

  return 1;
}

/* =========================
STUDENT DETAILS
========================= */

function openStudentDetails(id) {
  const student = state.students.find((s) => s.id === id);

  if (!student) return;

  const paid = isPaidThisMonth(student.id);

  const payments = state.payments.filter(
    (payment) => payment.studentId === student.id,
  );

  openModal(`

        <div class="modal-header">

            <div>

                <h2>
                    ${escapeHtml(student.name)}
                </h2>

                <p>
                    Seat ${student.seat}
                    ·
                    ${
                      student.status === "active"
                        ? "Current Student"
                        : "Previous Student"
                    }
                </p>

            </div>


            <button
                class="close-btn"
                onclick="closeModal()"
            >
                ✕
            </button>

        </div>


        <div class="details-grid">

            <div class="detail-box">

                <span>
                    Seat
                </span>

                <strong>
                    ${student.seat}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Mobile
                </span>

                <strong>
                    ${escapeHtml(student.mobile || "-")}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Joining Date
                </span>

                <strong>
                    ${dateText(student.joiningDate)}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Monthly Fee
                </span>

                <strong>
                    ${money(student.fee)}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Current Month
                </span>

                <strong>

                    ${
                      student.status === "active"
                        ? paid
                          ? "PAID"
                          : "PENDING"
                        : "LEFT"
                    }

                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Left Date
                </span>

                <strong>
                    ${dateText(student.leftDate)}
                </strong>

            </div>

        </div>


        <div style="height:16px"></div>


        <div
            class="section"
            style="
                box-shadow:none;
                background:#f8fafc;
                margin:0 20px;
                padding:14px
            "
        >

            <strong
                style="
                    font-size:13px
                "
            >
                Payment History
            </strong>


            <div
                style="
                    height:8px
                "
            ></div>


            ${
              payments.length
                ? payments
                    .map(
                      (payment) => `

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                padding:7px 0;
                                border-bottom:1px solid #e5e7eb;
                                font-size:11px
                            "
                        >

                            <span>
                                ${payment.month}
                                ·
                                ${dateText(payment.date)}
                            </span>

                            <strong>
                                ${money(payment.amount)}
                            </strong>

                        </div>

                    `,
                    )
                    .join("")
                : `
                    <span
                        style="
                            color:#6b7280;
                            font-size:11px
                        "
                    >
                        No payments recorded.
                    </span>
                `
            }

        </div>


        <div class="modal-footer">

            ${
              student.status === "active"
                ? `

                    <button
                        class="btn btn-light"
                        onclick="
                            closeModal();
                            openStudentForm(
                                null,
                                '${student.id}'
                            )
                        "
                    >
                        Edit
                    </button>


                    <button
                        class="btn btn-success"
                        onclick="
                            closeModal();
                            openPaymentForm(
                                '${student.id}'
                            )
                        "
                    >
                        Mark Fee Paid
                    </button>


                    <button
                        class="btn btn-danger"
                        onclick="
                            confirmLeave(
                                '${student.id}'
                            )
                        "
                    >
                        Student Left
                    </button>

                `
                : ""
            }


            <button
                class="btn btn-light"
                onclick="closeModal()"
            >
                Close
            </button>

        </div>

    `);
}

/* =========================
PAYMENT FORM
========================= */

function openPaymentForm(studentId) {
  const student = state.students.find((s) => s.id === studentId);

  if (!student) return;

  openModal(`

        <div class="modal-header">

            <div>

                <h2>
                    Record Fee Payment
                </h2>

                <p>
                    ${escapeHtml(student.name)}
                    ·
                    Seat ${student.seat}
                </p>

            </div>


            <button
                class="close-btn"
                onclick="closeModal()"
            >
                ✕
            </button>

        </div>


        <form id="paymentForm">

            <div class="form-grid">


                <div class="form-group">

                    <label>
                        Amount
                    </label>

                    <input
                        name="amount"
                        type="number"
                        min="1"
                        value="${student.fee}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Month
                    </label>

                    <input
                        name="month"
                        type="month"
                        value="${new Date().toISOString().slice(0, 7)}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Payment Date
                    </label>

                    <input
                        name="date"
                        type="date"
                        value="${new Date().toISOString().slice(0, 10)}"
                        required
                    >

                </div>


                <div class="form-group">

                    <label>
                        Note
                    </label>

                    <input
                        name="note"
                        placeholder="Cash / UPI / other"
                    >

                </div>


            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-light"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    type="submit"
                    class="btn btn-success"
                >
                    Save Payment
                </button>

            </div>

        </form>

    `);

  document
    .getElementById("paymentForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = new FormData(event.target);

      try {
        await api("/api/payments", {
          method: "POST",

          body: JSON.stringify({
            studentId,

            amount: Number(form.get("amount")),

            month: form.get("month"),

            date: form.get("date"),

            note: form.get("note"),
          }),
        });

        closeModal();

        await loadData();

        activateMenu("fees");

        showToast("Fee payment saved.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
}

/* =========================
PAYMENT HISTORY
========================= */

function showStudentPayments(studentId) {
  const student = state.students.find((s) => s.id === studentId);

  const payments = state.payments.filter((p) => p.studentId === studentId);

  openModal(`

        <div class="modal-header">

            <div>

                <h2>
                    Payment History
                </h2>

                <p>
                    ${escapeHtml(student.name)}
                    ·
                    Seat ${student.seat}
                </p>

            </div>


            <button
                class="close-btn"
                onclick="closeModal()"
            >
                ✕
            </button>

        </div>


        <div
            style="
                padding:20px
            "
        >

            ${
              payments.length
                ? payments
                    .map(
                      (payment) => `

                        <div
                            class="detail-box"
                            style="
                                margin-bottom:8px;
                                display:flex;
                                justify-content:space-between
                            "
                        >

                            <span>
                                ${payment.month}
                                ·
                                ${dateText(payment.date)}
                            </span>

                            <strong>
                                ${money(payment.amount)}
                            </strong>

                        </div>

                    `,
                    )
                    .join("")
                : `
                    <div class="empty-state">
                        No payments.
                    </div>
                `
            }

        </div>


        <div class="modal-footer">

            <button
                class="btn btn-light"
                onclick="closeModal()"
            >
                Close
            </button>

        </div>

    `);
}

/* =========================
STUDENT LEAVE
========================= */

async function confirmLeave(id) {
  const student = state.students.find((s) => s.id === id);

  if (!student) return;

  const yes = confirm(
    `Are you sure ${student.name} is leaving the library?\n\nSeat ${student.seat} will become EMPTY, but the student's old record will remain.`,
  );

  if (!yes) return;

  try {
    await api(`/api/students/${id}/leave`, {
      method: "POST",

      body: JSON.stringify({
        leftDate: new Date().toISOString().slice(0, 10),
      }),
    });

    closeModal();

    await loadData();

    activateMenu("records");

    showToast(`Seat ${student.seat} is now empty.`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =========================
SETTINGS
========================= */

function renderSettings() {
  pageContent.innerHTML = `

        <div class="settings-grid">


            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Library Settings
                        </div>

                        <div class="section-subtitle">
                            Change basic library information
                        </div>

                    </div>

                </div>


                <form id="settingsForm">

                    <div class="form-group">

                        <label>
                            Library Name
                        </label>

                        <input
                            name="libraryName"
                            value="${escapeAttr(state.settings.libraryName)}"
                            required
                        >

                    </div>


                    <br>


                    <div class="form-group">

                        <label>
                            Admin Name
                        </label>

                        <input
                            name="adminName"
                            value="${escapeAttr(state.settings.adminName)}"
                            required
                        >

                    </div>


                    <br>


                    <div class="form-group">

                        <label>
                            Default Monthly Fee
                        </label>

                        <input
                            name="monthlyFeeDefault"
                            type="number"
                            min="0"
                            value="${state.settings.monthlyFeeDefault}"
                        >

                    </div>


                    <br>


                    <button
                        class="btn btn-primary"
                        type="submit"
                    >
                        Save Settings
                    </button>

                </form>

            </div>


            <div class="section">

                <div class="section-header">

                    <div>

                        <div class="section-title">
                            Data Backup
                        </div>

                        <div class="section-subtitle">
                            Download a copy of your library data
                        </div>

                    </div>

                </div>


                <p
                    style="
                        color:#6b7280;
                        font-size:11px;
                        line-height:1.6;
                        margin-bottom:15px
                    "
                >
                    Your students, fee payments and history
                    are stored in the local data.json file.
                </p>


                <button
                    class="btn btn-success"
                    onclick="downloadBackup()"
                >
                    Download Backup
                </button>

            </div>


        </div>

    `;

  document
    .getElementById("settingsForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = new FormData(event.target);

      try {
        await api("/api/settings", {
          method: "PUT",

          body: JSON.stringify({
            libraryName: form.get("libraryName"),

            adminName: form.get("adminName"),

            monthlyFeeDefault: Number(form.get("monthlyFeeDefault")),
          }),
        });

        await loadData();

        activateMenu("settings");

        showToast("Settings saved.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
}

/* =========================
BACKUP
========================= */

async function downloadBackup() {
  try {
    const data = await api("/api/backup");

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `library-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    link.click();

    URL.revokeObjectURL(url);

    showToast("Backup downloaded.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* =========================
MODAL
========================= */

function openModal(html) {
  modal.innerHTML = html;

  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");

  modal.innerHTML = "";
}

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

/* =========================
TOAST
========================= */

let toastTimer;

function showToast(message, type = "success") {
  toast.textContent = message;

  toast.className = "toast show";

  if (type === "error") {
    toast.classList.add("error");
  }

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2500);
}

/* =========================
START
========================= */

loadData().catch((error) => {
  pageContent.innerHTML = `

                <div class="section">

                    <div class="empty-state">

                        Could not load data:

                        <br><br>

                        ${escapeHtml(error.message)}

                    </div>

                </div>

            `;
});
