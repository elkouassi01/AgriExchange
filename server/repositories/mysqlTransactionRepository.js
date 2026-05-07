const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapTransactionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    userId: row.user_id,
    typeTransaction: row.type_transaction,
    montant: Number(row.montant),
    devise: row.devise,
    methode: row.methode,
    servicePaiement: row.service_paiement,
    statut: row.status,
    reference: row.reference,
    description: row.description,
    metadata: row.metadata || {},
    donneesAPI: row.provider_response || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createTransaction = async (data) => {
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO transactions (
      id, user_id, montant, status, methode, reference,
      metadata, provider_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId || null,
      data.montant,
      data.statut || 'pending',
      data.methode || null,
      data.reference || null,
      JSON.stringify(data.metadata || {}),
      JSON.stringify(data.donneesAPI || {}),
    ]
  );
  return getTransactionById(id);
};

const getTransactionById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
  return mapTransactionRow(rows[0]);
};

const getTransactionByReference = async (reference) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM transactions WHERE reference = ?', [reference]);
  return mapTransactionRow(rows[0]);
};

const getUserTransactions = async (userId, page = 1, limit = 20) => {
  const pool = getMysqlPool();
  const offset = (page - 1) * limit;

  const [[countRows], [rows]] = await Promise.all([
    pool.query('SELECT COUNT(*) AS total FROM transactions WHERE user_id = ?', [userId]),
    pool.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    ),
  ]);

  const total = parseInt(countRows[0].total, 10);
  return {
    total,
    page,
    totalPages: Math.ceil(total / limit),
    transactions: rows.map(mapTransactionRow),
  };
};

const updateTransactionStatus = async (id, statut, donneesAPI) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE transactions SET status = ?, provider_response = ?, updated_at = NOW() WHERE id = ?`,
    [statut, JSON.stringify(donneesAPI || {}), id]
  );
  return getTransactionById(id);
};

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionByReference,
  getUserTransactions,
  updateTransactionStatus,
};
