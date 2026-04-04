const express = require("express");

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access denied" });
  }

  next();
}

module.exports = ({ db }) => {
  const apiRouter = express.Router();
  const legacyRouter = express.Router();
  const dbPromise = db.promise();

  async function listProducts(req, res) {
    try {
      const [rows] = await dbPromise.query("SELECT * FROM products");
      res.json(rows);
    } catch (error) {
      console.error("Ошибка получения товаров:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function getProduct(req, res) {
    try {
      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Не найдено" });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error("Ошибка получения товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function createProduct(req, res) {
    const title = req.body.title?.trim();
    const price = req.body.price;
    const image = req.body.image?.trim();

    if (!title || !price || !image) {
      return res.status(400).json({ ok: false, error: "Заполните все поля" });
    }

    try {
      const [result] = await dbPromise.query(
        "INSERT INTO products (title, price, image) VALUES (?, ?, ?)",
        [title, price, image]
      );

      res.json({ ok: true, id: result.insertId });
    } catch (error) {
      console.error("Ошибка добавления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function updateProduct(req, res) {
    const title = req.body.title?.trim();
    const price = req.body.price;
    const image = req.body.image?.trim();

    if (!title || !price || !image) {
      return res.status(400).json({ ok: false, error: "Заполните все поля" });
    }

    try {
      const [result] = await dbPromise.query(
        "UPDATE products SET title = ?, price = ?, image = ? WHERE id = ?",
        [title, price, image, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function deleteProduct(req, res) {
    try {
      const [result] = await dbPromise.query("DELETE FROM products WHERE id = ?", [req.params.id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка удаления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  apiRouter.get("/", listProducts);
  apiRouter.get("/:id", getProduct);
  apiRouter.post("/", requireAdmin, createProduct);
  apiRouter.put("/:id", requireAdmin, updateProduct);
  apiRouter.delete("/:id", requireAdmin, deleteProduct);

  legacyRouter.get("/products", listProducts);
  legacyRouter.get("/products/:id", getProduct);
  legacyRouter.post("/products", requireAdmin, createProduct);
  legacyRouter.put("/products/:id", requireAdmin, updateProduct);
  legacyRouter.delete("/products/:id", requireAdmin, deleteProduct);

  return [
    { path: "/api/items", router: apiRouter },
    { path: "/api/products", router: apiRouter },
    { path: "/", router: legacyRouter }
  ];
};

