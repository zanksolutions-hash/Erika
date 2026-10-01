const express = require("express");
const Database = require("better-sqlite3");
const helmet = require("helmet");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me-before-production";

const db = new Database(path.join(__dirname, "appointments.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appointment_date, appointment_time)
  );
`);

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

app.get("/api/slots", (req, res) => {
  const date = req.query.date;
  if (!date || !isValidDate(date)) {
    return res.status(400).json({ error: "Date invalide." });
  }

  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  if (day === 0 || day === 6) {
    return res.json({ date, slots: [] });
  }

  const booked = db.prepare(
    "SELECT appointment_time FROM appointments WHERE appointment_date = ?"
  ).all(date).map(r => r.appointment_time);

  const slots = DEFAULT_SLOTS.filter(slot => !booked.includes(slot));
  res.json({ date, slots });
});

app.post("/api/appointments", (req, res) => {
  const { fullName, email, phone, date, time, consent } = req.body || {};

  if (!fullName || !email || !date || !time || consent !== true) {
    return res.status(400).json({ error: "Merci de compléter les champs obligatoires." });
  }

  if (!isValidDate(date) || !DEFAULT_SLOTS.includes(time)) {
    return res.status(400).json({ error: "Créneau invalide." });
  }

  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  if (day === 0 || day === 6) {
    return res.status(400).json({ error: "Les rendez-vous ne sont pas disponibles le week-end." });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO appointments (full_name, email, phone, appointment_date, appointment_time)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      String(fullName).trim(),
      String(email).trim().toLowerCase(),
      phone ? String(phone).trim() : "",
      date,
      time
    );

    res.status(201).json({
      ok: true,
      id: info.lastInsertRowid,
      message: "Votre demande de rendez-vous a bien été enregistrée."
    });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Ce créneau vient d’être réservé. Merci d’en choisir un autre." });
    }
    console.error(err);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

app.get("/api/admin/appointments", (req, res) => {
  if (req.header("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const rows = db.prepare(`
    SELECT id, full_name, email, phone, appointment_date, appointment_time, created_at
    FROM appointments
    ORDER BY appointment_date, appointment_time
  `).all();

  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Site disponible sur http://localhost:${PORT}`);
});
