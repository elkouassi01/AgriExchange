const { getMysqlPool } = require('../config/mysql');

let tableReady = false;

const ensureTable = async () => {
  if (tableReady) return;
  const pool = getMysqlPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id VARCHAR(100) NOT NULL UNIQUE,
      product_id VARCHAR(100) NOT NULL,
      status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
      amount INT DEFAULT 300,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL,
      INDEX idx_transaction_id (transaction_id),
      INDEX idx_product_id (product_id)
    )
  `);
  tableReady = true;
};

const createPendingPayment = async (transactionId, productId) => {
  await ensureTable();
  const pool = getMysqlPool();
  await pool.query(
    'INSERT INTO product_payments (transaction_id, product_id, status, amount) VALUES (?, ?, "pending", 300)',
    [transactionId, String(productId)]
  );
};

const markAsPaid = async (transactionId) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    'UPDATE product_payments SET status = "paid", paid_at = NOW() WHERE transaction_id = ?',
    [transactionId]
  );
  return result.affectedRows > 0;
};

const checkPaymentForProduct = async (transactionId, productId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT status FROM product_payments WHERE transaction_id = ? AND product_id = ?',
    [transactionId, String(productId)]
  );
  return rows[0] || null;
};

module.exports = { createPendingPayment, markAsPaid, checkPaymentForProduct };
