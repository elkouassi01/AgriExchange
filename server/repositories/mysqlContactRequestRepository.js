const { getMysqlPool } = require('../config/mysql');

let tableReady = false;

const ensureTables = async () => {
  if (tableReady) return;
  const pool = getMysqlPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id            CHAR(36)     NOT NULL,
      payment_id    VARCHAR(100) NOT NULL,
      product_id    VARCHAR(100) NOT NULL,
      seller_id     CHAR(36)     NOT NULL,
      product_nom   VARCHAR(100),
      seller_phone  VARCHAR(30)  NOT NULL,
      buyer_phone   VARCHAR(30),
      status        ENUM('pending','responded','expired','refunded') DEFAULT 'pending',
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at    DATETIME     NOT NULL,
      responded_at  DATETIME     NULL,
      refunded_at   DATETIME     NULL,
      PRIMARY KEY (id),
      INDEX idx_status_expires (status, expires_at),
      INDEX idx_seller_id (seller_id),
      INDEX idx_payment_id (payment_id)
    )
  `);

  // Ajouter colonnes suspension sur users si absentes (vérification individuelle)
  const [c1] = await pool.query(`SHOW COLUMNS FROM users LIKE 'suspended'`);
  if (c1.length === 0) {
    await pool.query(`ALTER TABLE users ADD COLUMN suspended TINYINT(1) NOT NULL DEFAULT 0`);
    console.log('[DB] Colonne suspended ajoutée à users');
  }
  const [c2] = await pool.query(`SHOW COLUMNS FROM users LIKE 'penalty_amount'`);
  if (c2.length === 0) {
    await pool.query(`ALTER TABLE users ADD COLUMN penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0`);
    console.log('[DB] Colonne penalty_amount ajoutée à users');
  }
  const [c3] = await pool.query(`SHOW COLUMNS FROM users LIKE 'suspended_at'`);
  if (c3.length === 0) {
    await pool.query(`ALTER TABLE users ADD COLUMN suspended_at DATETIME NULL`);
    console.log('[DB] Colonne suspended_at ajoutée à users');
  }

  tableReady = true;
};

const { randomUUID } = require('crypto');

const createContactRequest = async ({ paymentId, productId, productNom, sellerId, sellerPhone, buyerPhone }) => {
  await ensureTables();
  const pool = getMysqlPool();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  await pool.query(
    `INSERT INTO contact_requests
       (id, payment_id, product_id, product_nom, seller_id, seller_phone, buyer_phone, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, paymentId, productId, productNom, sellerId, sellerPhone, buyerPhone || null, expiresAt]
  );
  return id;
};

const findPendingBySellerPhone = async (phone) => {
  const pool = getMysqlPool();
  const normalized = phone.replace(/\D/g, '');
  const [rows] = await pool.query(
    `SELECT * FROM contact_requests
     WHERE REPLACE(REPLACE(seller_phone, '+', ''), ' ', '') = ?
       AND status = 'pending'
       AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
};

const markResponded = async (id) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE contact_requests SET status = 'responded', responded_at = NOW() WHERE id = ?`,
    [id]
  );
};

const getExpiredPending = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT cr.*, u.nom AS seller_nom, u.contact AS seller_contact
     FROM contact_requests cr
     JOIN users u ON u.id = cr.seller_id
     WHERE cr.status = 'pending' AND cr.expires_at < NOW()`
  );
  return rows;
};

const markExpired = async (id) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE contact_requests SET status = 'expired' WHERE id = ?`,
    [id]
  );
};

const markRefunded = async (id) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE contact_requests SET status = 'refunded', refunded_at = NOW() WHERE id = ?`,
    [id]
  );
};

const suspendSeller = async (sellerId) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE users SET suspended = 1, suspended_at = NOW(), penalty_amount = penalty_amount + 300
     WHERE id = ?`,
    [sellerId]
  );
};

const getPendingRefunds = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT cr.*, u.nom AS seller_nom, u.contact AS seller_phone_num,
            pp.amount AS montant_paye
     FROM contact_requests cr
     JOIN users u ON u.id = cr.seller_id
     LEFT JOIN product_payments pp ON pp.transaction_id = cr.payment_id
     WHERE cr.status = 'expired'
     ORDER BY cr.expires_at DESC`
  );
  return rows;
};

module.exports = {
  ensureTables,
  createContactRequest,
  findPendingBySellerPhone,
  markResponded,
  getExpiredPending,
  markExpired,
  markRefunded,
  suspendSeller,
  getPendingRefunds,
};
