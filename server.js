const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require("express-session");
const createAuthRoutes = require("./routes/auth");
const createProductRoutes = require("./routes/products");
const createUserRoutes = require("./routes/users");

const app = express();
const port = 3000;

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1111",
  database: "flower_shop"
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access denied" });
  }

  next();
}

function redirectAuthorizedUserToProfile(req, res, next) {
  if (req.session?.user) {
    return res.redirect("/lk");
  }

  next();
}

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
  secret: "flora_go_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  req.user = req.session?.user || null;
  next();
});

for (const { path, router } of createAuthRoutes({ db, isValidEmail })) {
  app.use(path, router);
}

for (const { path, router } of createProductRoutes({ db })) {
  app.use(path, router);
}

for (const { path, router } of createUserRoutes({ db, isValidEmail })) {
  app.use(path, router);
}

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/auth/login", redirectAuthorizedUserToProfile, (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/auth/register", redirectAuthorizedUserToProfile, (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/lk", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/admin", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/login.html", (req, res) => {
  res.redirect("/auth/login");
});

app.get("/lk.html", (req, res) => {
  res.redirect("/lk");
});

app.get("/admin.html", (req, res) => {
  const search = new URLSearchParams();

  if (req.query.edit) {
    search.set("edit", req.query.edit);
  }

  const query = search.toString();
  res.redirect(query ? `/admin?${query}` : "/admin");
});

app.get("/check_role", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post("/update_user_full", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, error: "Не авторизован" });
  }

  const login = req.body.login?.trim();
  const email = req.body.email?.trim();
  const phone = req.body.phone?.trim();
  const userId = req.session.user.id;

  if (!login) return res.status(400).json({ ok: false, error: "Логин обязателен" });
  if (!email) return res.status(400).json({ ok: false, error: "Email обязателен" });
  if (!phone) return res.status(400).json({ ok: false, error: "Телефон обязателен" });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: "Некорректный email" });
  if (login.length < 3) return res.status(400).json({ ok: false, error: "Логин должен быть не короче 3 символов" });
  if (phone.includes("+")) return res.status(400).json({ ok: false, error: "Телефон без +" });
  if (!/^\d+$/.test(phone)) return res.status(400).json({ ok: false, error: "Телефон должен содержать только цифры" });
  if (phone.length !== 12) return res.status(400).json({ ok: false, error: "Неверная длина телефона" });

  try {
    const dbPromise = db.promise();
    const [[loginRows], [emailRows], [phoneRows]] = await Promise.all([
      dbPromise.query("SELECT id FROM users WHERE login = ? AND id != ?", [login, userId]),
      dbPromise.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]),
      dbPromise.query("SELECT id FROM users WHERE phone = ? AND id != ?", [phone, userId])
    ]);

    if (loginRows.length > 0) {
      return res.status(400).json({ ok: false, error: "Логин уже занят" });
    }

    if (emailRows.length > 0) {
      return res.status(400).json({ ok: false, error: "Email уже занят" });
    }

    if (phoneRows.length > 0) {
      return res.status(400).json({ ok: false, error: "Телефон уже занят" });
    }

    await dbPromise.query(
      "UPDATE users SET login = ?, email = ?, phone = ? WHERE id = ?",
      [login, email, phone, userId]
    );

    req.session.user.login = login;
    req.session.user.email = email;
    req.session.user.phone = phone;

    res.json({ ok: true });
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);
    res.status(500).json({ ok: false, error: "Ошибка сервера" });
  }
});

db.connect((error) => {
  if (error) {
    console.error("Ошибка подключения к MySQL:", error);
    return;
  }

  app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
  });
});
