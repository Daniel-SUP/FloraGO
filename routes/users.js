const express = require("express");
const bcrypt = require("bcrypt");

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access denied" });
  }

  next();
}

module.exports = ({ db, isValidEmail }) => {
  const router = express.Router();
  const dbPromise = db.promise();

  function normalizeUser(row) {
    return {
      id: row.id,
      login: row.login,
      email: row.email,
      phone: row.phone,
      role: row.role || "user"
    };
  }

  function parseUserId(rawId) {
    const userId = Number(rawId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  function validatePhone(phone) {
    if (!phone) return "Телефон обязателен";
    if (phone.includes("+")) return "Укажите номер телефона без +";
    if (!/^\d+$/.test(phone)) return "Номер телефона должен содержать только цифры";
    if (phone.length !== 12) return "Номер телефона указан неверно";
    return null;
  }

  function validateRole(role) {
    return role === "user" || role === "admin";
  }

  async function ensureUserIsUnique({ login, email, phone, excludeId = null }) {
    const conditions = [];
    const params = [];

    if (login) {
      conditions.push("login = ?");
      params.push(login);
    }

    if (email) {
      conditions.push("email = ?");
      params.push(email);
    }

    if (phone) {
      conditions.push("phone = ?");
      params.push(phone);
    }

    if (conditions.length === 0) {
      return null;
    }

    let query = `SELECT id, login, email, phone FROM users WHERE (${conditions.join(" OR ")})`;

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const [rows] = await dbPromise.query(query, params);
    if (rows.length === 0) {
      return null;
    }

    const duplicate = rows[0];
    if (login && duplicate.login === login) return "Такой логин уже существует";
    if (email && duplicate.email === email) return "Пользователь с таким email уже существует";
    if (phone && duplicate.phone === phone) return "Этот номер телефона уже зарегистрирован";
    return "Пользователь с такими данными уже существует";
  }

  async function listUsers(req, res) {
    try {
      const [rows] = await dbPromise.query("SELECT id, login, email, phone, role FROM users ORDER BY id DESC");
      res.json({ ok: true, users: rows.map(normalizeUser) });
    } catch (error) {
      console.error("Ошибка получения пользователей:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function getUser(req, res) {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Некорректный id пользователя" });
    }

    try {
      const [rows] = await dbPromise.query(
        "SELECT id, login, email, phone, role FROM users WHERE id = ?",
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Пользователь не найден" });
      }

      res.json({ ok: true, user: normalizeUser(rows[0]) });
    } catch (error) {
      console.error("Ошибка получения пользователя:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function createUser(req, res) {
    const login = req.body.login?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password;
    const phone = req.body.phone?.trim();
    const role = req.body.role?.trim() || "user";

    if (!login) return res.status(400).json({ ok: false, error: "Логин обязателен" });
    if (!email) return res.status(400).json({ ok: false, error: "Email обязателен" });
    if (!password) return res.status(400).json({ ok: false, error: "Пароль обязателен" });
    if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: "Некорректный email" });
    if (login.length < 3) return res.status(400).json({ ok: false, error: "Логин должен быть не короче 3 символов" });
    if (password.length < 6) return res.status(400).json({ ok: false, error: "Пароль должен быть не менее 6 символов" });

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json({ ok: false, error: phoneError });
    if (!validateRole(role)) return res.status(400).json({ ok: false, error: "Некорректная роль" });

    try {
      const duplicateError = await ensureUserIsUnique({ login, email, phone });
      if (duplicateError) {
        return res.status(400).json({ ok: false, error: duplicateError });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await dbPromise.query(
        "INSERT INTO users (login, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
        [login, email, hashedPassword, phone, role]
      );

      const [rows] = await dbPromise.query(
        "SELECT id, login, email, phone, role FROM users WHERE id = ?",
        [result.insertId]
      );

      res.status(201).json({ ok: true, user: normalizeUser(rows[0]) });
    } catch (error) {
      console.error("Ошибка создания пользователя:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function updateUser(req, res) {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Некорректный id пользователя" });
    }

    const login = req.body.login?.trim();
    const email = req.body.email?.trim();
    const phone = req.body.phone?.trim();
    const role = req.body.role?.trim();
    const password = req.body.password;

    if (!login) return res.status(400).json({ ok: false, error: "Логин обязателен" });
    if (!email) return res.status(400).json({ ok: false, error: "Email обязателен" });
    if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: "Некорректный email" });
    if (login.length < 3) return res.status(400).json({ ok: false, error: "Логин должен быть не короче 3 символов" });

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json({ ok: false, error: phoneError });
    if (!validateRole(role)) return res.status(400).json({ ok: false, error: "Некорректная роль" });
    if (password && password.length < 6) {
      return res.status(400).json({ ok: false, error: "Пароль должен быть не менее 6 символов" });
    }

    try {
      const [existingRows] = await dbPromise.query("SELECT id FROM users WHERE id = ?", [userId]);
      if (existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: "Пользователь не найден" });
      }

      const duplicateError = await ensureUserIsUnique({ login, email, phone, excludeId: userId });
      if (duplicateError) {
        return res.status(400).json({ ok: false, error: duplicateError });
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbPromise.query(
          "UPDATE users SET login = ?, email = ?, phone = ?, role = ?, password = ? WHERE id = ?",
          [login, email, phone, role, hashedPassword, userId]
        );
      } else {
        await dbPromise.query(
          "UPDATE users SET login = ?, email = ?, phone = ?, role = ? WHERE id = ?",
          [login, email, phone, role, userId]
        );
      }

      const [rows] = await dbPromise.query(
        "SELECT id, login, email, phone, role FROM users WHERE id = ?",
        [userId]
      );

      if (req.session?.user?.id === userId) {
        req.session.user.login = rows[0].login;
        req.session.user.email = rows[0].email;
        req.session.user.phone = rows[0].phone;
        req.session.user.role = rows[0].role;
        req.user = req.session.user;
      }

      res.json({ ok: true, user: normalizeUser(rows[0]) });
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function deleteUser(req, res) {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(400).json({ ok: false, error: "Некорректный id пользователя" });
    }

    if (req.session?.user?.id === userId) {
      return res.status(400).json({ ok: false, error: "Нельзя удалить текущего авторизованного пользователя" });
    }

    try {
      const [result] = await dbPromise.query("DELETE FROM users WHERE id = ?", [userId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Пользователь не найден" });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка удаления пользователя:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  router.get("/", requireAdmin, listUsers);
  router.get("/:id", requireAdmin, getUser);
  router.post("/", requireAdmin, createUser);
  router.put("/:id", requireAdmin, updateUser);
  router.delete("/:id", requireAdmin, deleteUser);

  return [
    { path: "/api/users", router }
  ];
};
