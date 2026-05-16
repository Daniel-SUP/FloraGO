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

  function requireAuth(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Не авторизован" });
    }

    next();
  }

  function normalizeProduct(row) {
    return {
      id: row.id,
      title: row.title,
      price: row.price,
      image: row.image,
      description: row.description || "",
      rating: row.rating,
      reviews: row.reviews
    };
  }

  function parseProductId(rawId) {
    const productId = Number(rawId);
    return Number.isInteger(productId) && productId > 0 ? productId : null;
  }

  function normalizeReview(row) {
    return {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      authorName: row.author_name,
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.created_at
    };
  }

  function validateProductPayload(body) {
    const title = body.title?.trim();
    const image = body.image?.trim();
    const description = body.description?.trim() || "";
    const price = Number(body.price);

    if (!title || !image || Number.isNaN(price)) {
      return { ok: false, error: "title, price и image обязательны" };
    }

    if (price <= 0) {
      return { ok: false, error: "price должен быть больше 0" };
    }

    return { ok: true, value: { title, price, image, description } };
  }

  function validateReviewPayload(body) {
    const comment = body.comment?.trim();
    const rating = Number(body.rating);

    if (!comment) {
      return { ok: false, error: "Текст отзыва обязателен" };
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: "Оценка должна быть от 1 до 5" };
    }

    return { ok: true, value: { comment, rating } };
  }

  async function updateProductReviewStats(productId) {
    await dbPromise.query(
      `
        UPDATE products p
        LEFT JOIN (
          SELECT
            product_id,
            COUNT(*) AS review_count,
            ROUND(AVG(rating), 1) AS average_rating
          FROM product_reviews
          WHERE product_id = ?
          GROUP BY product_id
        ) r ON r.product_id = p.id
        SET
          p.reviews = COALESCE(r.review_count, 0),
          p.rating = COALESCE(r.average_rating, 0)
        WHERE p.id = ?
      `,
      [productId, productId]
    );
  }

  async function productExists(productId) {
    const [rows] = await dbPromise.query("SELECT id FROM products WHERE id = ?", [productId]);
    return rows.length > 0;
  }

  async function listProducts(req, res) {
    try {
      const [rows] = await dbPromise.query("SELECT * FROM products");
      const products = rows.map(normalizeProduct);

      if (req.baseUrl === "") {
        return res.json(products);
      }

      res.json({ ok: true, products });
    } catch (error) {
      console.error("Ошибка получения товаров:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function getProduct(req, res) {
    const productId = parseProductId(req.params.id);

    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [productId]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const product = normalizeProduct(rows[0]);

      if (req.baseUrl === "") {
        return res.json(product);
      }

      res.json({ ok: true, product });
    } catch (error) {
      console.error("Ошибка получения товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function createProduct(req, res) {
    const validation = validateProductPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const { title, price, image, description } = validation.value;

    try {
      const [result] = await dbPromise.query(
        "INSERT INTO products (title, price, image, description) VALUES (?, ?, ?, ?)",
        [title, price, image, description]
      );

      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
      const product = normalizeProduct(rows[0]);

      if (req.baseUrl === "") {
        return res.json({ ok: true, id: result.insertId });
      }

      res.status(201).json({ ok: true, product });
    } catch (error) {
      console.error("Ошибка добавления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function listProductReviews(req, res) {
    const productId = parseProductId(req.params.id);

    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      if (!(await productExists(productId))) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const [rows] = await dbPromise.query(
        `
          SELECT id, product_id, user_id, author_name, rating, comment, created_at
          FROM product_reviews
          WHERE product_id = ?
          ORDER BY created_at DESC, id DESC
        `,
        [productId]
      );

      const reviews = rows.map(normalizeReview);

      if (req.baseUrl === "") {
        return res.json(reviews);
      }

      res.json({ ok: true, reviews });
    } catch (error) {
      console.error("Ошибка получения отзывов:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function createProductReview(req, res) {
    const productId = parseProductId(req.params.id);

    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    const validation = validateReviewPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    try {
      if (!(await productExists(productId))) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const { comment, rating } = validation.value;
      const authorName = req.user.login;
      const userId = req.user.id;

      const [result] = await dbPromise.query(
        `
          INSERT INTO product_reviews (product_id, user_id, author_name, rating, comment)
          VALUES (?, ?, ?, ?, ?)
        `,
        [productId, userId, authorName, rating, comment]
      );

      await updateProductReviewStats(productId);

      const [rows] = await dbPromise.query(
        `
          SELECT id, product_id, user_id, author_name, rating, comment, created_at
          FROM product_reviews
          WHERE id = ?
        `,
        [result.insertId]
      );

      const review = normalizeReview(rows[0]);

      if (req.baseUrl === "") {
        return res.status(201).json(review);
      }

      res.status(201).json({ ok: true, review });
    } catch (error) {
      console.error("Ошибка добавления отзыва:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function updateProduct(req, res) {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    const validation = validateProductPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const { title, price, image, description } = validation.value;

    try {
      const [result] = await dbPromise.query(
        "UPDATE products SET title = ?, price = ?, image = ?, description = ? WHERE id = ?",
        [title, price, image, description, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      const [rows] = await dbPromise.query("SELECT * FROM products WHERE id = ?", [productId]);
      const product = normalizeProduct(rows[0]);

      if (req.baseUrl === "") {
        return res.json({ ok: true });
      }

      res.json({ ok: true, product });
    } catch (error) {
      console.error("Ошибка обновления товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function deleteProduct(req, res) {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [result] = await dbPromise.query("DELETE FROM products WHERE id = ?", [productId]);

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
  apiRouter.get("/:id/reviews", listProductReviews);
  apiRouter.post("/:id/reviews", requireAuth, createProductReview);
  apiRouter.post("/", requireAdmin, createProduct);
  apiRouter.put("/:id", requireAdmin, updateProduct);
  apiRouter.delete("/:id", requireAdmin, deleteProduct);

  legacyRouter.get("/products", listProducts);
  legacyRouter.get("/products/:id", getProduct);
  legacyRouter.get("/products/:id/reviews", listProductReviews);
  legacyRouter.post("/products/:id/reviews", requireAuth, createProductReview);
  legacyRouter.post("/products", requireAdmin, createProduct);
  legacyRouter.put("/products/:id", requireAdmin, updateProduct);
  legacyRouter.delete("/products/:id", requireAdmin, deleteProduct);

  return [
    { path: "/api/products", router: apiRouter },
    { path: "", router: legacyRouter }
  ];
};
