const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;

const DATA_FILE = path.join(__dirname, "data.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const defaultData = {
  settings: {
    libraryName: "My Library",
    adminName: "Admin",
    monthlyFeeDefault: 600,
  },

  students: [],
  payments: [],
  history: [],
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readData() {
  ensureDataFile();

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));

    return JSON.parse(JSON.stringify(defaultData));
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",

    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(data));
}

function sendText(
  res,
  status,
  text,
  contentType = "text/plain; charset=utf-8",
) {
  res.writeHead(status, {
    "Content-Type": contentType,
  });

  res.end(text);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 2 * 1024 * 1024) {
        req.destroy();

        reject(new Error("Request too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, "File Not Found");

      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    const types = {
      ".html": "text/html; charset=utf-8",

      ".css": "text/css; charset=utf-8",

      ".js": "text/javascript; charset=utf-8",

      ".json": "application/json; charset=utf-8",
    };

    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
    });

    res.end(data);
  });
}

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function validateSeat(seat) {
  return (
    Number.isInteger(Number(seat)) && Number(seat) >= 1 && Number(seat) <= 120
  );
}

ensureDataFile();

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  const pathname = parsed.pathname;

  try {
    // =========================
    // GET ALL DATA
    // =========================

    if (pathname === "/api/data" && req.method === "GET") {
      return sendJson(res, 200, readData());
    }

    // =========================
    // ADD STUDENT
    // =========================

    if (pathname === "/api/students" && req.method === "POST") {
      const body = await getRequestBody(req);

      const data = readData();

      const seat = Number(body.seat);

      const name = String(body.name || "").trim();

      const mobile = String(body.mobile || "").trim();

      const fee = Number(body.fee);

      if (!name) {
        return sendJson(res, 400, {
          error: "Student name is required.",
        });
      }

      if (!validateSeat(seat)) {
        return sendJson(res, 400, {
          error: "Seat must be between 1 and 120.",
        });
      }

      if (
        data.students.some(
          (student) => student.seat === seat && student.status === "active",
        )
      ) {
        return sendJson(res, 400, {
          error: "This seat is already occupied.",
        });
      }

      const student = {
        id: makeId("stu"),

        seat,

        name,

        mobile,

        course: String(body.course || "").trim(),

        joiningDate: body.joiningDate || today(),

        fee:
          Number.isFinite(fee) && fee >= 0
            ? fee
            : Number(data.settings.monthlyFeeDefault || 600),

        status: "active",

        leftDate: null,
      };

      data.students.push(student);

      data.history.unshift({
        id: makeId("hist"),

        type: "joined",

        date: today(),

        studentId: student.id,

        studentName: student.name,

        seat: student.seat,

        note: `Student joined and seat ${student.seat} was allotted.`,
      });

      writeData(data);

      return sendJson(res, 201, student);
    }

    // =========================
    // EDIT STUDENT
    // =========================

    if (pathname.startsWith("/api/students/") && req.method === "PUT") {
      const id = pathname.split("/")[3];

      const body = await getRequestBody(req);

      const data = readData();

      const student = data.students.find((s) => s.id === id);

      if (!student) {
        return sendJson(res, 404, {
          error: "Student not found.",
        });
      }

      if (student.status !== "active") {
        return sendJson(res, 400, {
          error: "Left students cannot be edited here.",
        });
      }

      const newSeat = Number(body.seat);

      if (!validateSeat(newSeat)) {
        return sendJson(res, 400, {
          error: "Seat must be between 1 and 120.",
        });
      }

      const occupiedByOther = data.students.some(
        (s) => s.id !== id && s.status === "active" && s.seat === newSeat,
      );

      if (occupiedByOther) {
        return sendJson(res, 400, {
          error: "That seat is already occupied.",
        });
      }

      student.name = String(body.name || "").trim();

      student.mobile = String(body.mobile || "").trim();

      student.course = String(body.course || "").trim();

      student.joiningDate = body.joiningDate || student.joiningDate;

      student.fee = Math.max(0, Number(body.fee) || 0);

      student.seat = newSeat;

      data.history.unshift({
        id: makeId("hist"),

        type: "updated",

        date: today(),

        studentId: student.id,

        studentName: student.name,

        seat: student.seat,

        note: "Student details updated.",
      });

      writeData(data);

      return sendJson(res, 200, student);
    }

    // =========================
    // STUDENT LEFT
    // =========================

    if (
      pathname.startsWith("/api/students/") &&
      pathname.endsWith("/leave") &&
      req.method === "POST"
    ) {
      const parts = pathname.split("/");

      const id = parts[3];

      const body = await getRequestBody(req);

      const data = readData();

      const student = data.students.find((s) => s.id === id);

      if (!student) {
        return sendJson(res, 404, {
          error: "Student not found.",
        });
      }

      if (student.status === "left") {
        return sendJson(res, 400, {
          error: "Student has already left.",
        });
      }

      student.status = "left";

      student.leftDate = body.leftDate || today();

      data.history.unshift({
        id: makeId("hist"),

        type: "left",

        date: student.leftDate,

        studentId: student.id,

        studentName: student.name,

        seat: student.seat,

        note: `Student left. Seat ${student.seat} is now empty.`,
      });

      writeData(data);

      return sendJson(res, 200, student);
    }

    // =========================
    // ADD PAYMENT
    // =========================

    if (pathname === "/api/payments" && req.method === "POST") {
      const body = await getRequestBody(req);

      const data = readData();

      const student = data.students.find(
        (s) => s.id === body.studentId && s.status === "active",
      );

      if (!student) {
        return sendJson(res, 404, {
          error: "Active student not found.",
        });
      }

      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          error: "Enter a valid payment amount.",
        });
      }

      const payment = {
        id: makeId("pay"),

        studentId: student.id,

        studentName: student.name,

        seat: student.seat,

        amount,

        month: String(body.month || new Date().toISOString().slice(0, 7)),

        date: body.date || today(),

        note: String(body.note || "").trim(),
      };

      data.payments.unshift(payment);

      data.history.unshift({
        id: makeId("hist"),

        type: "payment",

        date: payment.date,

        studentId: student.id,

        studentName: student.name,

        seat: student.seat,

        note: `Fee payment of ₹${amount} received for ${payment.month}.`,
      });

      writeData(data);

      return sendJson(res, 201, payment);
    }

    // =========================
    // SETTINGS
    // =========================

    if (pathname === "/api/settings" && req.method === "PUT") {
      const body = await getRequestBody(req);

      const data = readData();

      data.settings.libraryName = String(
        body.libraryName || "My Library",
      ).trim();

      data.settings.adminName = String(body.adminName || "Admin").trim();

      data.settings.monthlyFeeDefault = Math.max(
        0,
        Number(body.monthlyFeeDefault) || 0,
      );

      writeData(data);

      return sendJson(res, 200, data.settings);
    }

    // =========================
    // BACKUP
    // =========================

    if (pathname === "/api/backup" && req.method === "GET") {
      return sendJson(res, 200, readData());
    }

    // =========================
    // WEBSITE FILES
    // =========================

    if (req.method === "GET") {
      let filePath =
        pathname === "/"
          ? path.join(PUBLIC_DIR, "index.html")
          : path.join(PUBLIC_DIR, pathname);

      filePath = path.normalize(filePath);

      if (!filePath.startsWith(path.normalize(PUBLIC_DIR))) {
        return sendText(res, 403, "Forbidden");
      }

      return sendFile(res, filePath);
    }

    sendText(res, 404, "Not Found");
  } catch (error) {
    console.error(error);

    sendJson(res, 500, {
      error: error.message || "Server error.",
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Library Management Software running at http://localhost:${PORT}`,
  );

  console.log(`Data is saved in: ${DATA_FILE}`);
});
