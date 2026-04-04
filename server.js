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

//РІС…РѕРґ РІ Р°РєРєР°СѓРЅС‚
app.post('/login', (req, res) => {
  const { login, password } = req.body;

  if (!login) {
    return res.status(400).send('login РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ');
  }

  if (!password) {
    return res.status(400).send('password РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ');
  }

  // 1. РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
  const sql = 'SELECT * FROM users WHERE login = ?';
  db.query(sql, [login], async (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('РћС€РёР±РєР° Р±Р°Р·С‹ РґР°РЅРЅС‹С…');
    }

    // РџРѕР»СЊР·РѕРІР°С‚РµР»СЏ РЅРµС‚
    if (rows.length === 0) {
      return res.status(400).send('РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ');
    }

    const user = rows[0];

    // 2. РЎСЂР°РІРЅРёРІР°РµРј РїР°СЂРѕР»Рё
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send('РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ');
    }
    const role = user.role;
    // 3. РЈРґР°С‡РЅС‹Р№ РІС…РѕРґ
     req.session.user = {
      id: user.id,
      login: user.login,
      role: user.role,
      phone: user.phone
    };
   // РџРµСЂРµРєРёРґС‹РІР°РµРј РЅР° РѕСЃРЅРѕРІРЅСѓСЋ СЃС‚СЂР°РЅРёС†Сѓ СЃ РїР°СЂР°РјРµС‚СЂРѕРј login
    res.json({ redirect: "/"});
  });
});




//СЂРµРіРёСЃС‚СЂР°С†РёСЏ Р°РєРєР°СѓРЅС‚Р°
app.post('/registr', (req, res) => {
  const { login, password, phone } = req.body;

  if (!login) {
    return res.status(400).send('login РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ');
  }

  if (!password) {
    return res.status(400).send('password РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ');
  }

  if (!phone) {
  return res.status(400).send('phone РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ');
}

// Р·Р°РїСЂРµС‰Р°РµРј +
if (phone.includes('+')) {
  return res.status(400).send('СѓРєР°Р¶РёС‚Рµ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° Р±РµР· +');
}

// С‚РѕР»СЊРєРѕ С†РёС„СЂС‹
if (!/^\d+$/.test(phone)) {
  return res.status(400).send('РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ С‚РѕР»СЊРєРѕ С†РёС„СЂС‹');
}

// РґР»РёРЅР° РЅРѕРјРµСЂР°
if (phone.length != 12) {
  return res.status(400).send('РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° СѓРєР°Р·Р°РЅ РЅРµРІРµСЂРЅРѕ');
}


 const checkSql = 'SELECT * FROM users WHERE login = ? OR phone = ?';
 db.query(checkSql, [login, phone], async (err, rows) => {
      if (err) {
        console.error('РћС€РёР±РєР° РїСЂРѕРІРµСЂРєРё:', err);
        return res.status(500).send('РћС€РёР±РєР° Р±Р°Р·С‹ РґР°РЅРЅС‹С…');
      }

      if (rows.length > 0) {
       if (rows[0].login === login) {
        return res.status(400).send("РўР°РєРѕР№ Р»РѕРіРёРЅ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚!");
    }
        if (rows[0].phone === phone) {
        return res.status(400).send("Р­С‚РѕС‚ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° СѓР¶Рµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ!");
    }
}


      // С…РµС€РёСЂРѕРІР°РЅРёРµ РїР°СЂРѕР»СЏ
      const hashed_password = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (login, password, phone) VALUES (?, ?, ?)';
  db.query(sql, [login, hashed_password, phone], (err, result) => {
    if (err) {
      console.error('РћС€РёР±РєР° РІСЃС‚Р°РІРєРё:', err);
      return res.status(500).send('РћС€РёР±РєР° Р±Р°Р·С‹ РґР°РЅРЅС‹С…');
    }
  
      req.session.user = {
      login: login,
      role: "user",
      phone: phone
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
    role: req.session.user.role,
    phone: req.session.user.phone
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
    return res.json({ ok: false, error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" });
  }

  const { login, phone } = req.body;

  if (!login) return res.json({ ok: false, error: "Р›РѕРіРёРЅ РѕР±СЏР·Р°С‚РµР»РµРЅ" });
  if (!phone) return res.json({ ok: false, error: "РўРµР»РµС„РѕРЅ РѕР±СЏР·Р°С‚РµР»РµРЅ" });

  // РџСЂРѕРІРµСЂРєР° С‚РµР»РµС„РѕРЅР°
  if (phone.includes("+")) return res.json({ ok: false, error: "РўРµР»РµС„РѕРЅ Р±РµР· +" });
  if (!/^\d+$/.test(phone)) return res.json({ ok: false, error: "РўРѕР»СЊРєРѕ С†РёС„СЂС‹" });
  if (phone.length === 12) return res.json({ ok: false, error: "РќРµРІРµСЂРЅР°СЏ РґР»РёРЅР° С‚РµР»РµС„РѕРЅР°" });

// РџСЂРѕРІРµСЂРєР° СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚Рё
  const checkLoginSql = "SELECT id FROM users WHERE login = ? AND id != ?";
db.query(checkLoginSql, [login, req.session.user.id], (err, rows) => {
  if (err) return res.json({ ok: false, error: "РћС€РёР±РєР° Р±Р°Р·С‹" });
  if (rows.length > 0) return res.json({ ok: false, error: "Р›РѕРіРёРЅ СѓР¶Рµ Р·Р°РЅСЏС‚" });

  const checkPhoneSql = "SELECT id FROM users WHERE phone = ? AND id != ?";
  db.query(checkPhoneSql, [phone, req.session.user.id], (err2, rows2) => {
    if (err2) return res.json({ ok: false, error: "РћС€РёР±РєР° Р±Р°Р·С‹" });
    if (rows2.length > 0) return res.json({ ok: false, error: "Р”Р°РЅРЅС‹Р№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° СѓР¶Рµ Р·Р°СЂРµРіРµСЃС‚СЂРёСЂРѕРІР°РЅ" });

    const sql = "UPDATE users SET login = ?, phone = ? WHERE id = ?";
    db.query(sql, [login, phone, req.session.user.id], (err) => {
      if (err) return res.json({ ok: false, error: "РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ" });

      // РћР±РЅРѕРІР»СЏРµРј СЃРµСЃСЃРёСЋ
      req.session.user.login = login;
      req.session.user.phone = phone;

      res.json({ ok: true });
    });
  });
});

});


