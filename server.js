require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require("express-session");
const nodemailer = require("nodemailer");
const createAuthRoutes = require("./routes/auth");
const createProductRoutes = require("./routes/products");
const createUserRoutes = require("./routes/users");
const createAccountRoutes = require("./routes/account");

const app = express();
const port = Number(process.env.PORT) || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME
});

function createMailer() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return {
      enabled: false,
      async sendPasswordResetCode({ to, code }) {
        console.log(`[password-reset] SMTP не настроен. Код для ${to}: ${code}`);
      }
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  return {
    enabled: true,
    async sendPasswordResetCode({ to, code }) {
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject: "FloraGO: код для восстановления пароля",
        text: `Ваш код для восстановления пароля: ${code}. Код действует 10 минут.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1f2937;">
            <h2>FloraGO</h2>
            <p>Ваш код для восстановления пароля:</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
            <p>Код действует 10 минут. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
          </div>
        `
      });
    }
  };
}

const mailer = createMailer();

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
  secret: process.env.SESSION_SECRET || "flora_go_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  req.user = req.session?.user || null;
  next();
});

for (const { path, router } of createAuthRoutes({ db, isValidEmail, mailer })) {
  app.use(path, router);
}

for (const { path, router } of createProductRoutes({ db })) {
  app.use(path, router);
}

for (const { path, router } of createUserRoutes({ db, isValidEmail })) {
  app.use(path, router);
}

for (const { path, router } of createAccountRoutes({ db })) {
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

app.get("/auth/forgot-password", redirectAuthorizedUserToProfile, (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/auth/reset-password", redirectAuthorizedUserToProfile, (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/lk", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/favorites", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/cart", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/admin", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/catalog", (req, res) => {
  res.sendFile(`${__dirname}/main.html`);
});

app.get("/catalog/:id", (req, res) => {
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

  Promise.all([
    db.promise().query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_favorites_user_product (user_id, product_id),
        CONSTRAINT fk_favorites_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_favorites_product
          FOREIGN KEY (product_id) REFERENCES products(id)
          ON DELETE CASCADE
      )
    `),
    db.promise().query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_cart_user_product (user_id, product_id),
        CONSTRAINT fk_cart_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_cart_product
          FOREIGN KEY (product_id) REFERENCES products(id)
          ON DELETE CASCADE,
        CONSTRAINT chk_cart_quantity
          CHECK (quantity > 0)
      )
    `),
    db.promise().query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NULL,
        author_name VARCHAR(255) NOT NULL,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_product_reviews_product
          FOREIGN KEY (product_id) REFERENCES products(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_product_reviews_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE SET NULL,
        CONSTRAINT chk_product_reviews_rating
          CHECK (rating BETWEEN 1 AND 5)
      )
    `),
    db.promise().query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used TINYINT(1) NOT NULL DEFAULT 0,
        last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_password_resets_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE
      )
    `),
    db.promise().query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS flower_type VARCHAR(100)
    `)
  ])
    .then(() => {
      app.listen(port, () => {
        console.log(`Сервер запущен: http://localhost:${port}`);
        if (!mailer.enabled) {
          console.log("SMTP не настроен. Коды восстановления будут выводиться в консоль.");
        }
      });
    })
    .catch((initError) => {
      console.error("Ошибка инициализации базы данных:", initError);
    });
});
