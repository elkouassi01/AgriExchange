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
      buyer_phone VARCHAR(30) NULL,
      buyer_email VARCHAR(150) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL,
      INDEX idx_transaction_id (transaction_id),
      INDEX idx_product_id (product_id)
    )
  `);
  // Table préexistante avant l'ajout de ces colonnes — les ajouter si absentes.
  for (const col of ['buyer_phone VARCHAR(30) NULL', 'buyer_email VARCHAR(150) NULL']) {
    const [name] = col.split(' ');
    try {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'product_payments' AND column_name = ?`,
        [name]
      );
      if (rows[0].cnt === 0) {
        await pool.query(`ALTER TABLE product_payments ADD COLUMN ${col}`);
      }
    } catch (e) {
      console.warn('[DB] Colonne ignorée: product_payments.' + name + ' —', e.message.split('\n')[0]);
    }
  }
  tableReady = true;
};

// buyerPhone/buyerEmail sont capturés dès le lancement du paiement (pas seulement
// à la confirmation) pour qu'une trace de qui a initié la transaction existe même
// si l'acheteur ne revient jamais compléter le flux /check.
const createPendingPayment = async (transactionId, productId, { amount = 300, buyerPhone = null, buyerEmail = null } = {}) => {
  await ensureTable();
  const pool = getMysqlPool();
  await pool.query(
    'INSERT INTO product_payments (transaction_id, product_id, status, amount, buyer_phone, buyer_email) VALUES (?, ?, "pending", ?, ?, ?)',
    [transactionId, String(productId), amount, buyerPhone, buyerEmail]
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

const findPaidByProductAndBuyer = async (productId, { phone, email }) => {
  await ensureTable();
  const pool = getMysqlPool();
  const conditions = [];
  const params = [String(productId)];
  if (phone) {
    conditions.push(`REPLACE(REPLACE(buyer_phone, '+', ''), ' ', '') = ?`);
    params.push(phone.replace(/\D/g, ''));
  }
  if (email) {
    conditions.push('LOWER(buyer_email) = LOWER(?)');
    params.push(email.trim());
  }
  if (!conditions.length) return null;

  const [rows] = await pool.query(
    `SELECT * FROM product_payments
     WHERE product_id = ? AND status = 'paid' AND (${conditions.join(' OR ')})
     ORDER BY paid_at DESC LIMIT 1`,
    params
  );
  return rows[0] || null;
};

const checkPaymentForProduct = async (transactionId, productId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT status, buyer_phone, buyer_email FROM product_payments WHERE transaction_id = ? AND product_id = ?',
    [transactionId, String(productId)]
  );
  return rows[0] || null;
};

module.exports = { createPendingPayment, markAsPaid, checkPaymentForProduct, findPaidByProductAndBuyer };
