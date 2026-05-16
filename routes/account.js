const express = require("express");

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: "Не авторизован" });
  }

  next();
}

module.exports = ({ db }) => {
  const router = express.Router();
  const dbPromise = db.promise();

  function parseProductId(rawId) {
    const productId = Number(rawId);
    return Number.isInteger(productId) && productId > 0 ? productId : null;
  }

  function normalizeProduct(row) {
    return {
      id: row.id,
      title: row.title,
      price: Number(row.price),
      image: row.image,
      description: row.description || "",
      rating: Number(row.rating),
      reviews: Number(row.reviews)
    };
  }

  function normalizeFavorite(row) {
    return {
      product: normalizeProduct(row),
      createdAt: row.created_at
    };
  }

  function normalizeCartItem(row) {
    const price = Number(row.price);
    const quantity = Number(row.quantity);

    return {
      product: normalizeProduct(row),
      quantity,
      lineTotal: Number((price * quantity).toFixed(2)),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async function productExists(productId) {
    const [rows] = await dbPromise.query("SELECT id FROM products WHERE id = ?", [productId]);
    return rows.length > 0;
  }

  async function listFavorites(req, res) {
    try {
      const [rows] = await dbPromise.query(
        `
          SELECT
            f.created_at,
            p.id,
            p.title,
            p.price,
            p.image,
            p.description,
            p.rating,
            p.reviews
          FROM favorites f
          INNER JOIN products p ON p.id = f.product_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `,
        [req.user.id]
      );

      res.json({ ok: true, favorites: rows.map(normalizeFavorite) });
    } catch (error) {
      console.error("Ошибка получения избранного:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function addFavorite(req, res) {
    const productId = parseProductId(req.body.productId);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      if (!(await productExists(productId))) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      await dbPromise.query(
        `
          INSERT INTO favorites (user_id, product_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
        `,
        [req.user.id, productId]
      );

      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Ошибка добавления в избранное:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function removeFavorite(req, res) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      await dbPromise.query(
        "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
        [req.user.id, productId]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка удаления из избранного:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function listCart(req, res) {
    try {
      const [rows] = await dbPromise.query(
        `
          SELECT
            c.quantity,
            c.created_at,
            c.updated_at,
            p.id,
            p.title,
            p.price,
            p.image,
            p.description,
            p.rating,
            p.reviews
          FROM cart_items c
          INNER JOIN products p ON p.id = c.product_id
          WHERE c.user_id = ?
          ORDER BY c.updated_at DESC, c.id DESC
        `,
        [req.user.id]
      );

      const items = rows.map(normalizeCartItem);
      const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

      res.json({ ok: true, items, total });
    } catch (error) {
      console.error("Ошибка получения корзины:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function addToCart(req, res) {
    const productId = parseProductId(req.body.productId);
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);

    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ ok: false, error: "Количество должно быть больше 0" });
    }

    try {
      if (!(await productExists(productId))) {
        return res.status(404).json({ ok: false, error: "Товар не найден" });
      }

      await dbPromise.query(
        `
          INSERT INTO cart_items (user_id, product_id, quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            quantity = quantity + VALUES(quantity),
            updated_at = CURRENT_TIMESTAMP
        `,
        [req.user.id, productId, quantity]
      );

      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Ошибка добавления в корзину:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function updateCartItem(req, res) {
    const productId = parseProductId(req.params.productId);
    const quantity = Number(req.body.quantity);

    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ ok: false, error: "Количество должно быть больше 0" });
    }

    try {
      const [result] = await dbPromise.query(
        `
          UPDATE cart_items
          SET quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND product_id = ?
        `,
        [quantity, req.user.id, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден в корзине" });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка обновления корзины:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function removeFromCart(req, res) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      await dbPromise.query(
        "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
        [req.user.id, productId]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error("Ошибка удаления из корзины:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function getProductState(req, res) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [[favoriteRows], [cartRows]] = await Promise.all([
        dbPromise.query(
          "SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ? LIMIT 1",
          [req.user.id, productId]
        ),
        dbPromise.query(
          "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ? LIMIT 1",
          [req.user.id, productId]
        )
      ]);

      res.json({
        ok: true,
        state: {
          isFavorite: favoriteRows.length > 0,
          cartQuantity: cartRows.length > 0 ? Number(cartRows[0].quantity) : 0
        }
      });
    } catch (error) {
      console.error("Ошибка получения состояния товара:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function checkoutCart(req, res) {
    try {
      const [rows] = await dbPromise.query(
        `
          SELECT c.product_id, c.quantity, p.title
          FROM cart_items c
          INNER JOIN products p ON p.id = c.product_id
          WHERE c.user_id = ?
        `,
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(400).json({ ok: false, error: "Корзина пуста" });
      }

      await dbPromise.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);

      res.json({
        ok: true,
        message: "Заказ оформлен",
        purchased: rows.map((row) => ({
          productId: row.product_id,
          title: row.title,
          quantity: Number(row.quantity)
        }))
      });
    } catch (error) {
      console.error("Ошибка оформления корзины:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  async function checkoutCartItem(req, res) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Некорректный id товара" });
    }

    try {
      const [rows] = await dbPromise.query(
        `
          SELECT c.product_id, c.quantity, p.title
          FROM cart_items c
          INNER JOIN products p ON p.id = c.product_id
          WHERE c.user_id = ? AND c.product_id = ?
        `,
        [req.user.id, productId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Товар не найден в корзине" });
      }

      await dbPromise.query(
        "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
        [req.user.id, productId]
      );

      res.json({
        ok: true,
        message: "Товар оформлен",
        purchased: {
          productId: rows[0].product_id,
          title: rows[0].title,
          quantity: Number(rows[0].quantity)
        }
      });
    } catch (error) {
      console.error("Ошибка оформления товара из корзины:", error);
      res.status(500).json({ ok: false, error: "Ошибка сервера" });
    }
  }

  router.get("/favorites", requireAuth, listFavorites);
  router.post("/favorites", requireAuth, addFavorite);
  router.delete("/favorites/:productId", requireAuth, removeFavorite);

  router.get("/cart", requireAuth, listCart);
  router.post("/cart", requireAuth, addToCart);
  router.post("/cart/checkout", requireAuth, checkoutCart);
  router.post("/cart/:productId/checkout", requireAuth, checkoutCartItem);
  router.put("/cart/:productId", requireAuth, updateCartItem);
  router.delete("/cart/:productId", requireAuth, removeFromCart);

  router.get("/products/:productId/state", requireAuth, getProductState);

  return [
    { path: "/api/account", router }
  ];
};
