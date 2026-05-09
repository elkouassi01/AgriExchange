const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const SPONSOR_DURATION_DAYS = 14;
const SPONSOR_AMOUNT = 5000;

let tableReady = false;

const ensureTable = async () => {
  if (tableReady) return;
  const pool = getMysqlPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sponsor_payments (
      id             CHAR(36)      NOT NULL,
      product_id     CHAR(36)      NOT NULL,
      seller_id      CHAR(36)      NOT NULL,
      transaction_id VARCHAR(120)  NOT NULL UNIQUE,
      amount         DECIMAL(12,2) NOT NULL DEFAULT ${SPONSOR_AMOUNT},
      status         ENUM('pending','active','expired','failed') NOT NULL DEFAULT 'pending',
      start_date     DATETIME      NULL,
      end_date       DATETIME      NULL,
      created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_psp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_psp_seller  FOREIGN KEY (seller_id)  REFERENCES users(id)    ON DELETE CASCADE,
      INDEX idx_psp_tx   (transaction_id),
      INDEX idx_psp_prod (product_id),
      INDEX idx_psp_seller (seller_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
};

const createPending = async (productId, sellerId, transactionId) => {
  await ensureTable();
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO product_sponsor_payments (id, product_id, seller_id, transaction_id, amount, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [id, productId, sellerId, transactionId, SPONSOR_AMOUNT],
  );
  return id;
};

const getByTxId = async (transactionId) => {
  await ensureTable();
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM product_sponsor_payments WHERE transaction_id = ? LIMIT 1',
    [transactionId],
  );
  return rows[0] || null;
};

// Active le paiement + met à jour is_featured et paid_sponsor_until sur le produit
const activateSponsor = async (transactionId) => {
  await ensureTable();
  const pool = getMysqlPool();

  const record = await getByTxId(transactionId);
  if (!record) return null;
  if (record.status === 'active') return record; // déjà activé (idempotent)

  const now = new Date();
  const endDate = new Date(now.getTime() + SPONSOR_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `UPDATE product_sponsor_payments
     SET status='active', start_date=?, end_date=?
     WHERE transaction_id=?`,
    [now, endDate, transactionId],
  );

  await pool.query(
    `UPDATE products
     SET is_featured=1, paid_sponsor_until=?
     WHERE id=?`,
    [endDate, record.product_id],
  );

  return { ...record, status: 'active', start_date: now, end_date: endDate };
};

// Désactive les sponsorisations payantes expirées (à appeler via cron)
const expireOldSponsorships = async () => {
  const pool = getMysqlPool();
  try {
    // Expire les entrées dans la table de paiements
    await pool.query(
      `UPDATE product_sponsor_payments
       SET status='expired'
       WHERE status='active' AND end_date < NOW()`,
    );
    // Retire le flag is_featured sur les produits dont la sponsorisation payante est expirée
    // (mais uniquement si is_featured n'a pas été remis à 0 manuellement)
    await pool.query(
      `UPDATE products
       SET is_featured=0, paid_sponsor_until=NULL
       WHERE paid_sponsor_until IS NOT NULL AND paid_sponsor_until < NOW()`,
    );
  } catch (err) {
    console.error('[sponsor cron]', err.message);
  }
};

// Vérifie si un produit a un sponsoring payant actif
const getActivePaidSponsor = async (productId) => {
  await ensureTable();
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT * FROM product_sponsor_payments
     WHERE product_id=? AND status='active' AND end_date > NOW()
     ORDER BY end_date DESC LIMIT 1`,
    [productId],
  );
  return rows[0] || null;
};

module.exports = {
  createPending,
  getByTxId,
  activateSponsor,
  expireOldSponsorships,
  getActivePaidSponsor,
  SPONSOR_AMOUNT,
  SPONSOR_DURATION_DAYS,
};
