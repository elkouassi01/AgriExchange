// Associe chaque transaction_id au provider de paiement utilisé lors de l'initiation.
// Nécessaire depuis que le provider actif (cinetpay | cinetpay_legacy) est choisi
// dynamiquement — le webhook et le check de statut doivent savoir quel adapter
// interroger pour une transaction donnée, même si l'admin change de provider entre-temps.
const { getMysqlPool } = require('../config/mysql');

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const pool = getMysqlPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      transaction_id VARCHAR(100) NOT NULL PRIMARY KEY,
      provider_id    VARCHAR(30)  NOT NULL,
      created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

async function record(transactionId, providerId) {
  await ensureTable();
  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO payment_transactions (transaction_id, provider_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id)`,
    [transactionId, providerId]
  );
}

// Retourne le provider utilisé pour initier cette transaction, ou `fallback`
// si jamais enregistré (transaction antérieure à ce mécanisme).
async function getProvider(transactionId, fallback = 'cinetpay') {
  await ensureTable();
  const pool = getMysqlPool();
  const [[row]] = await pool.query(
    'SELECT provider_id FROM payment_transactions WHERE transaction_id = ?',
    [transactionId]
  );
  return row?.provider_id || fallback;
}

module.exports = { record, getProvider };
