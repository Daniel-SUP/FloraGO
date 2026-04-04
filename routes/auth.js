const express = require("express");
const bcrypt = require("bcrypt");

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

module.exports = ({ db, isValidEmail }) => {
  const apiRouter = express.Router();
  const legacyRouter = express.Router();
  const dbPromise = db.promise();

  async function registerUser(req) {
    const login = req.body.login?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password;
    const phone = req.body.phone?.trim();

    if (!login) throw createHttpError(400, "Логин обязателен");
    if (!email) throw createHttpError(400, "Email обязателен");
    if (!password) throw createHttpError(400, "Пароль обязателен");
    if (!phone) throw createHttpError(400, "Телефон обязателен");
    if (!isValidEmail(email)) throw createHttpError(400, "Некорректный email");
    if (password.length < 6) throw createHttpError(400, "Пароль должен быть не менее 6 символов");
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
      [credential, credential]
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
        const user = await handler(req, res);
        res.json({ ok: true, user });
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
