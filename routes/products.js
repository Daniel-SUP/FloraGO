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

  function normalizeItem(row) {
    return {
      id: row.id,
      title: row.title,
      price: row.price,
      image: row.image,
      rating: row.rating,
      reviews: row.reviews
    };
  }

  function parseItemId(rawId) {
    const itemId = Number(rawId);
    return Number.isInteger(itemId) && itemId > 0 ? itemId : null;
  }

  function validateItemPayload(body) {
    const title = body.title?.trim();
    const image = body.image?.trim();
    const price = Number(body.price);

    if (!title || !image || Number.isNaN(price)) {
      return { ok: false, error: "title, price и image обязательны" };
    }

    if (price <= 0) {
      return { ok: false, error: "price должен быть больше 0" };
    }

    return { ok: true, value: { title, price, image } };
  }

  async function listProducts(req, res) {
    try {
      const [rows] = await dbPromise.query("SELECT * FROM products");
      const items = rows.map(normalizeItem);

      if (req.baseUrl === "") {
        return res.json(items);
      }

      res.json({ ok: true, items });
    } catch (error) {
      console.error("Ошибка получения товаров:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function getProduct(req, res) {
    const itemId = parseItemId(req.params.id);

    if (!itemId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [itemId]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const item = normalizeItem(rows[0]);

      if (req.baseUrl === "") {
        return res.json(item);
      }

      res.json({ ok: true, item });
    } catch (error) {
      console.error("Ошибка получения товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function createProduct(req, res) {
    const validation = validateItemPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const { title, price, image } = validation.value;

    try {
      const [result] = await dbPromise.query(
        "INSERT INTO products (title, price, image) VALUES (?, ?, ?)",
        [title, price, image]
      );

      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
      const item = normalizeItem(rows[0]);

      if (req.baseUrl === "") {
        return res.json({ ok: true, id: result.insertId });
      }

      res.status(201).json({ ok: true, item });
    } catch (error) {
      console.error("Ошибка добавления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function updateProduct(req, res) {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    const validation = validateItemPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const { title, price, image } = validation.value;

    try {
      const [result] = await dbPromise.query(
        "UPDATE products SET title = ?, price = ?, image = ? WHERE id = ?",
        [title, price, image, itemId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [itemId]);
      const item = normalizeItem(rows[0]);

      if (req.baseUrl === "") {
        return res.json({ ok: true });
      }

      res.json({ ok: true, item });
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function deleteProduct(req, res) {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [result] = await dbPromise.query("DELETE FROM products WHERE id = ?", [itemId]);

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
    { path: "", router: legacyRouter }
  ];
};
