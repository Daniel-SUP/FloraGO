const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeUser(user) {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    phone: user.phone,
    role: user.role || "user"
  };
}

function normalizeLegacyUser(user) {
  return {
    username: user.login,
    email: user.email,
    phone: user.phone,
    role: user.role || "user"
  };
}

module.exports = ({ db, isValidEmail, mailer }) => {
  const apiRouter = express.Router();
  const legacyRouter = express.Router();
  const dbPromise = db.promise();
  const passwordResetCodeLifetimeMinutes = 10;
  const passwordResetMinIntervalSeconds = 60;
  const maxPasswordResetAttempts = 5;

  function generateResetCode() {
    return String(crypto.randomInt(100000, 1000000));
  }

  async function cleanupPasswordResets(userId) {
    await dbPromise.query(
      "DELETE FROM password_resets WHERE user_id = ? AND (used = 1 OR expires_at < NOW())",
      [userId]
    );
  }

  async function registerUser(req) {
    const login = req.body.login?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    const phone = req.body.phone?.trim();

    if (!login) throw createHttpError(400, "Логин обязателен");
    if (!email) throw createHttpError(400, "Email обязателен");
    if (!password) throw createHttpError(400, "Пароль обязателен");
    if (!phone) throw createHttpError(400, "Телефон обязателен");
    if (!isValidEmail(email)) throw createHttpError(400, "Некорректный email");
    if (password.length < 6) throw createHttpError(400, "Пароль должен быть не менее 6 символов");
    if (!/\d/.test(password)) throw createHttpError(400, "Пароль должен содержать цифры");
    if (!/[a-z]/i.test(password)) throw createHttpError(400, "Пароль должен содержать буквы");
    if (!/[A-Z]/.test(password)) throw createHttpError(400, "Пароль должен содержать хотя бы одну заглавную букву");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) throw createHttpError(400, "Пароль должен содержать спецсимвол (!@#$%^&* и т.д.)");
    if (login.length < 3) throw createHttpError(400, "Логин должен быть не короче 3 символов");
    if (phone.includes("+")) throw createHttpError(400, "Укажите номер телефона без +");
    if (!/^\d+$/.test(phone)) throw createHttpError(400, "Номер телефона должен содержать только цифры");
    if (phone.length !== 12) throw createHttpError(400, "Номер телефона указан неверно");

    const [existingUsers] = await dbPromise.query(
      "SELECT id, login, email, phone FROM users WHERE login = ? OR email = ? OR phone = ?",
      [login, email, phone]
    );

    if (existingUsers.length > 0) {
      const duplicate = existingUsers[0];

      if (duplicate.login === login) throw createHttpError(400, "Такой логин уже существует");
      if (duplicate.email === email) throw createHttpError(400, "Пользователь с таким email уже существует");
      if (duplicate.phone === phone) throw createHttpError(400, "Этот номер телефона уже зарегистрирован");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await dbPromise.query(
      "INSERT INTO users (login, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
      [login, email, hashedPassword, phone, "user"]
    );

    const user = normalizeUser({
      id: result.insertId,
      login,
      email,
      phone,
      role: "user"
    });

    req.session.user = user;
    req.user = user;

    return user;
  }

  async function loginUser(req) {
    const credential = req.body.credential?.trim() || req.body.login?.trim() || req.body.email?.trim();
    const password = req.body.password;

    if (!credential) throw createHttpError(400, "Логин или email обязателен");
    if (!password) throw createHttpError(400, "Пароль обязателен");

    const [rows] = await dbPromise.query(
      "SELECT id, login, email, password, phone, role FROM users WHERE login = ? OR email = ?",
      [credential, credential.toLowerCase()]
    );

    if (rows.length === 0) {
      throw createHttpError(400, "Пользователь не найден");
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw createHttpError(400, "Неверный пароль");
    }

    const normalizedUser = normalizeUser(user);
    req.session.user = normalizedUser;
    req.user = normalizedUser;

    return normalizedUser;
  }

  async function requestPasswordReset(req) {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) throw createHttpError(400, "Email обязателен");
    if (!isValidEmail(email)) throw createHttpError(400, "Некорректный email");

    const [rows] = await dbPromise.query(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return { message: "Если аккаунт с таким email существует, код отправлен" };
    }

    const user = rows[0];
    await cleanupPasswordResets(user.id);

    const [activeRows] = await dbPromise.query(
      `SELECT id, TIMESTAMPDIFF(SECOND, last_sent_at, NOW()) AS diff_seconds
       FROM password_resets
       WHERE user_id = ? AND used = 0 AND expires_at >= NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [user.id]
    );

    if (activeRows.length > 0) {
      const diffSeconds = activeRows[0].diff_seconds ?? passwordResetMinIntervalSeconds;

      if (diffSeconds < passwordResetMinIntervalSeconds) {
        throw createHttpError(
          429,
          `Повторно запросить код можно через ${passwordResetMinIntervalSeconds - diffSeconds} сек.`
        );
      }

      await dbPromise.query("UPDATE password_resets SET used = 1 WHERE id = ?", [activeRows[0].id]);
    }

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, 10);

    await dbPromise.query(
      `INSERT INTO password_resets (user_id, code_hash, expires_at, attempts, used, last_sent_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0, 0, NOW())`,
      [user.id, codeHash, passwordResetCodeLifetimeMinutes]
    );

    await mailer.sendPasswordResetCode({ to: user.email, code });

    return { message: "Если аккаунт с таким email существует, код отправлен" };
  }

  async function resetPassword(req) {
    const email = req.body.email?.trim().toLowerCase();
    const code = req.body.code?.trim();
    const newPassword = req.body.newPassword;

    if (!email) throw createHttpError(400, "Email обязателен");
    if (!isValidEmail(email)) throw createHttpError(400, "Некорректный email");
    if (!code) throw createHttpError(400, "Код обязателен");
    if (!/^\d{6}$/.test(code)) throw createHttpError(400, "Код должен состоять из 6 цифр");
    if (!newPassword) throw createHttpError(400, "Новый пароль обязателен");
    if (newPassword.length < 6) throw createHttpError(400, "Пароль должен быть не менее 6 символов");

    const [userRows] = await dbPromise.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (userRows.length === 0) {
      throw createHttpError(400, "Неверный код или email");
    }

    const userId = userRows[0].id;
    await cleanupPasswordResets(userId);

    const [resetRows] = await dbPromise.query(
      `SELECT id, code_hash, attempts
       FROM password_resets
       WHERE user_id = ? AND used = 0 AND expires_at >= NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    if (resetRows.length === 0) {
      throw createHttpError(400, "Код не найден или истек");
    }

    const reset = resetRows[0];

    if (reset.attempts >= maxPasswordResetAttempts) {
      await dbPromise.query("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id]);
      throw createHttpError(429, "Превышено количество попыток. Запросите новый код");
    }

    const isMatch = await bcrypt.compare(code, reset.code_hash);

    if (!isMatch) {
      await dbPromise.query("UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?", [reset.id]);
      throw createHttpError(400, "Неверный код или email");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await dbPromise.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    await dbPromise.query("UPDATE password_resets SET used = 1 WHERE user_id = ?", [userId]);

    if (req.session) {
      req.session.destroy(() => {});
    }

    return { message: "Пароль успешно изменен" };
  }

  function getCurrentUser(req) {
    if (!req.session.user) {
      throw createHttpError(401, "Не авторизован");
    }

    return req.session.user;
  }

  function logoutUser(req, res) {
    if (!req.session) {
      return res.json({ ok: true });
    }

    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ ok: false, error: "Не удалось выйти из аккаунта" });
      }

      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  }

  function handleApi(handler) {
    return async (req, res) => {
      try {
        const payload = await handler(req, res);

        if (payload && typeof payload === "object" && !Array.isArray(payload) && !("id" in payload)) {
          return res.json({ ok: true, ...payload });
        }

        res.json({ ok: true, user: payload });
      } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({ ok: false, error: error.message || "Ошибка сервера" });
      }
    };
  }

  function handleLegacy(handler) {
    return async (req, res) => {
      try {
        await handler(req, res);
        res.json({ ok: true, redirect: "/" });
      } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({ ok: false, error: error.message || "Ошибка сервера" });
      }
    };
  }

  apiRouter.post("/register", handleApi(registerUser));
  apiRouter.post("/login", handleApi(loginUser));
  apiRouter.post("/forgot-password", handleApi(requestPasswordReset));
  apiRouter.post("/reset-password", handleApi(resetPassword));
  apiRouter.get("/me", (req, res) => {
    try {
      res.json({ ok: true, user: getCurrentUser(req) });
    } catch (error) {
      res.status(error.status || 500).json({ ok: false, error: error.message || "Ошибка сервера" });
    }
  });
  apiRouter.post("/logout", logoutUser);

  legacyRouter.post("/registr", handleLegacy(registerUser));
  legacyRouter.post("/login", handleLegacy(loginUser));
  legacyRouter.get("/check_user_info", (req, res) => {
    if (!req.session.user) {
      return res.json({ username: null });
    }

    res.json(normalizeLegacyUser(req.session.user));
  });
  legacyRouter.post("/logout", logoutUser);

  return [
    { path: "/api/auth", router: apiRouter },
    { path: "/auth", router: apiRouter },
    { path: "/", router: legacyRouter }
  ];
};
