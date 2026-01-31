const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "healthy" });
  } catch {
    res.status(503).json({ status: "error", db: "unhealthy" });
  }
});

/* =========================
   PRODUCTS
========================= */
app.get("/api/products", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, price, stock FROM products ORDER BY id"
    );
    res.status(200).json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* =========================
   CREATE ORDER (ACID)
========================= */
app.post("/api/orders", async (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order request" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let totalAmount = 0;

    const orderResult = await client.query(
      "INSERT INTO orders (user_id, status, total_amount) VALUES ($1,$2,$3) RETURNING id",
      [userId, "processing", 0]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const { rows } = await client.query(
        "SELECT stock, price FROM products WHERE id = $1 FOR UPDATE",
        [item.productId]
      );

      if (rows.length === 0) {
        throw new Error("Product not found");
      }

      if (rows[0].stock < item.quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      totalAmount += rows[0].price * item.quantity;

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.productId]
      );

      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)",
        [orderId, item.productId, item.quantity, rows[0].price]
      );
    }

    await client.query(
      "UPDATE orders SET total_amount = $1 WHERE id = $2",
      [totalAmount, orderId]
    );

    await client.query(
      "INSERT INTO payments (order_id, amount, status) VALUES ($1,$2,$3)",
      [orderId, totalAmount, "succeeded"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      orderId,
      status: "processing",
      totalAmount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================
   GET ORDER DETAILS
========================= */
app.get("/api/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const orderRes = await pool.query(
      `
      SELECT 
        o.id AS "orderId",
        o.status,
        o.total_amount AS "totalAmount",
        o.created_at AS "createdAt",
        u.id AS "userId",
        u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = $1
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsRes = await pool.query(
      `
      SELECT 
        oi.product_id AS "productId",
        p.name AS "productName",
        oi.quantity,
        oi.price
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      `,
      [orderId]
    );

    const o = orderRes.rows[0];

    res.status(200).json({
      orderId: o.orderId,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      user: { id: o.userId, email: o.email },
      items: itemsRes.rows,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

/* =========================
   CANCEL ORDER (IDEMPOTENT)
========================= */
app.put("/api/orders/:orderId/cancel", async (req, res) => {
  const { orderId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (orderRes.rows[0].status === "cancelled") {
      await client.query("COMMIT");
      return res.status(200).json({ orderId, status: "cancelled" });
    }

    if (orderRes.rows[0].status === "shipped") {
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }

    const itemsRes = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [orderId]
    );

    for (const item of itemsRes.rows) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = $1",
      [orderId]
    );

    await client.query("COMMIT");

    res.status(200).json({ orderId, status: "cancelled" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================
   SERVER
========================= */
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
