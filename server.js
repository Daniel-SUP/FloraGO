const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require("bcrypt");
const session = require("express-session");


const app = express();
app.use(express.json());
const port = 3000;
app.use(express.static(__dirname));

// Единая точка входа SPA
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/main.html");
});

// Совместимость со старыми ссылками
app.get("/login.html", (req, res) => {
  res.redirect("/main.html?view=login");
});

app.get("/lk.html", (req, res) => {
  res.redirect("/main.html?view=lk");
});

app.get("/admin.html", (req, res) => {
  const edit = req.query.edit ? `&edit=${encodeURIComponent(req.query.edit)}` : "";
  res.redirect(`/main.html?view=admin${edit}`);
});
// Middleware РґР»СЏ РѕР±СЂР°Р±РѕС‚РєРё РґР°РЅРЅС‹С… С„РѕСЂРјС‹ (urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

// РќР°СЃС‚СЂРѕР№РєР° РїРѕРґРєР»СЋС‡РµРЅРёСЏ Рє MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1111',
  database: 'flower_shop'
});

db.connect(err => {
  if (err) {
    console.error('РћС€РёР±РєР° РїРѕРґРєР»СЋС‡РµРЅРёСЏ Рє MySQL:', err);
    return;
  }
  console.log('РЈСЃРїРµС€РЅРѕРµ РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє MySQL');
});

app.use(session({
  secret: "С‚РІРѕСЏ_СЃРµРєСЂРµС‚РЅР°СЏ_СЃС‚СЂРѕРєР°", // Р»СЋР±Р°СЏ СЃС‚СЂРѕРєР° РґР»СЏ РїРѕРґРїРёСЃРё cookie
  resave: false,                   // РЅРµ РїРµСЂРµСЃРѕС…СЂР°РЅСЏС‚СЊ РµСЃР»Рё РЅРµ РёР·РјРµРЅРёР»РѕСЃСЊ
  saveUninitialized: false,        // РЅРµ СЃРѕС…СЂР°РЅСЏС‚СЊ РїСѓСЃС‚С‹Рµ СЃРµСЃСЃРёРё
  cookie: { secure: false }        // РґР»СЏ http (РµСЃР»Рё https вЂ” СЃС‚Р°РІСЊ true)
}));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

//РІС…РѕРґ РІ Р°РєРєР°СѓРЅС‚
app.post('/login', (req, res) => {
  const { credential, password } = req.body;

  if (!credential) {
    return res.status(400).send('login или email обязателен');
  }

  if (!password) {
    return res.status(400).send('password обязателен');
  }

  const sql = 'SELECT id, login, email, password, phone, role FROM users WHERE login = ? OR email = ?';
  db.query(sql, [credential, credential], async (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Ошибка базы данных');
    }

    if (rows.length === 0) {
      return res.status(400).send('Пользователь не найден');
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send('Неверный пароль');
    }

    req.session.user = {
      id: user.id,
      login: user.login,
      email: user.email,
      phone: user.phone,
      role: user.role || "user",
    };

    res.json({ redirect: "/" });
  });
});




//СЂРµРіРёСЃС‚СЂР°С†РёСЏ Р°РєРєР°СѓРЅС‚Р°
app.post('/registr', (req, res) => {
  const { login, email, password, phone } = req.body;

  if (!login) {
    return res.status(400).send('login обязателен');
  }

  if (!email) {
    return res.status(400).send('email обязателен');
  }

  if (!password) {
    return res.status(400).send('password обязателен');
  }

  if (!phone) {
    return res.status(400).send('phone обязателен');
  }

  if (!isValidEmail(email)) {
    return res.status(400).send('Некорректный email');
  }

  if (password.length < 6) {
    return res.status(400).send('Пароль должен быть не менее 6 символов');
  }

  if (login.trim().length < 3) {
    return res.status(400).send('Логин должен быть не короче 3 символов');
  }

  if (phone.includes('+')) {
    return res.status(400).send('укажите номер телефона без +');
  }

  if (!/^\d+$/.test(phone)) {
    return res.status(400).send('номер телефона должен содержать только цифры');
  }

  if (phone.length !== 12) {
    return res.status(400).send('номер телефона указан неверно');
  }

 const checkSql = 'SELECT id, login, email, phone FROM users WHERE login = ? OR email = ? OR phone = ?';
 db.query(checkSql, [login, email, phone], async (err, rows) => {
      if (err) {
        console.error('Ошибка проверки:', err);
        return res.status(500).send('Ошибка базы данных');
      }

      if (rows.length > 0) {
        if (rows[0].login === login) return res.status(400).send("Такой логин уже существует");
        if (rows[0].email === email) return res.status(400).send("Пользователь с таким email уже существует");
        if (rows[0].phone === phone) return res.status(400).send("Этот номер телефона уже зарегистрирован");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = 'INSERT INTO users (login, email, password, phone, role) VALUES (?, ?, ?, ?, ?)';
      db.query(sql, [login.trim(), email, hashedPassword, phone, "user"], (err, result) => {
    if (err) {
      console.error('Ошибка вставки:', err);
      return res.status(500).send('Ошибка базы данных');
    }

    req.session.user = {
      id: result.insertId,
      login: login.trim(),
      email,
      phone,
      role: "user",
    };
    res.json({ redirect: "/" });
  });
    });
});

// Р·Р°РїСѓСЃРє СЃРµСЂРІРµСЂР°
app.listen(port, () => {
  console.log(`РЎРµСЂРІРµСЂ Р·Р°РїСѓС‰РµРЅ: http://localhost:${port}`);
});

app.use((req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
});

// РїСЂРѕРІРµСЂРєР° РЅР° Р°РґРјРёРЅР°
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

// Р·Р°С‰РёС‰С‘РЅРЅС‹Р№ РјР°СЂС€СЂСѓС‚
app.get("/check_role", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.get("/check_user_info", (req, res) => {
  if (!req.session.user) {
    return res.json({ username: null });
  }

  res.json({
    username: req.session.user.login,
    email: req.session.user.email,
    phone: req.session.user.phone,
    role: req.session.user.role,
  });
});


app.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid"); // РёРјСЏ cookie Р·Р°РІРёСЃРёС‚ РѕС‚ С‚РІРѕРµР№ РєРѕРЅС„РёРіСѓСЂР°С†РёРё
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});
//РїРѕР»СѓС‡РµРЅРёРµ С‚РѕРІР°СЂРѕРІ
app.get("/products", (req, res) => {
  const sql = "SELECT * FROM products";

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ С‚РѕРІР°СЂРѕРІ:", err);
      return res.status(500).json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" });
    }
    res.json(rows);
  });
});
//РґРѕР±Р°РІР»РµРЅРёРµ С‚РѕРІР°СЂР°
app.post("/products", requireAdmin, (req, res) => {
  const { title, price, image } = req.body;

  if (!title || !price || !image) {
    return res.status(400).json({ error: "Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ" });
  }

  const sql = "INSERT INTO products (title, price, image) VALUES (?, ?, ?)";

  db.query(sql, [title, price, image], (err, result) => {
    if (err) {
      console.error("РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ С‚РѕРІР°СЂР°:", err);
      return res.status(500).json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" });
    }

    res.json({ ok: true, id: result.insertId });
  });
});
//СѓРґР°Р»РµРЅРёРµ С‚РѕРІР°СЂР°
app.delete("/products/:id", requireAdmin, (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ С‚РѕРІР°СЂР°:", err);
      return res.status(500).json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    res.json({ ok: true });
  });
});


app.get("/products/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM products WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" });
    if (rows.length === 0) return res.status(404).json({ error: "РќРµ РЅР°Р№РґРµРЅРѕ" });

    res.json(rows[0]);
  });
});

app.put("/products/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const { title, price, image } = req.body;

  db.query(
    "UPDATE products SET title=?, price=?, image=? WHERE id=?",
    [title, price, image, id],
    (err) => {
      if (err) return res.status(500).json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" });
      res.json({ ok: true });
    }
  );
});

app.post("/update_user_full", (req, res) => {
  if (!req.session.user) {
    return res.json({ ok: false, error: "Не авторизован" });
  }

  const { login, email, phone } = req.body;

  if (!login) return res.json({ ok: false, error: "Логин обязателен" });
  if (!email) return res.json({ ok: false, error: "Email обязателен" });
  if (!phone) return res.json({ ok: false, error: "Телефон обязателен" });

  if (!isValidEmail(email)) return res.json({ ok: false, error: "Некорректный email" });
  if (login.trim().length < 3) return res.json({ ok: false, error: "Логин должен быть не короче 3 символов" });
  if (phone.includes("+")) return res.json({ ok: false, error: "Телефон без +" });
  if (!/^\d+$/.test(phone)) return res.json({ ok: false, error: "Телефон должен содержать только цифры" });
  if (phone.length !== 12) return res.json({ ok: false, error: "Неверная длина телефона" });

  const checkLoginSql = "SELECT id FROM users WHERE login = ? AND id != ?";
db.query(checkLoginSql, [login.trim(), req.session.user.id], (err, rows) => {
  if (err) return res.json({ ok: false, error: "Ошибка базы" });
  if (rows.length > 0) return res.json({ ok: false, error: "Логин уже занят" });

  const checkEmailSql = "SELECT id FROM users WHERE email = ? AND id != ?";
  db.query(checkEmailSql, [email, req.session.user.id], (err2, rows2) => {
    if (err2) return res.json({ ok: false, error: "Ошибка базы" });
    if (rows2.length > 0) return res.json({ ok: false, error: "Email уже занят" });

    const checkPhoneSql = "SELECT id FROM users WHERE phone = ? AND id != ?";
    db.query(checkPhoneSql, [phone, req.session.user.id], (err3, rows3) => {
      if (err3) return res.json({ ok: false, error: "Ошибка базы" });
      if (rows3.length > 0) return res.json({ ok: false, error: "Телефон уже занят" });

      const sql = "UPDATE users SET login = ?, email = ?, phone = ? WHERE id = ?";
      db.query(sql, [login.trim(), email, phone, req.session.user.id], (err4) => {
        if (err4) return res.json({ ok: false, error: "Ошибка обновления" });

        req.session.user.login = login.trim();
        req.session.user.email = email;
        req.session.user.phone = phone;
        res.json({ ok: true });
      });
    });
  });
});

});


