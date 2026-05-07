const { getPostgresPool } = require('../config/postgres');

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createTransaction = async (data) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO transactions (
      user_id, montant, status, methode, reference, 
      metadata, provider_response
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.userId,
      data.montant,
      data.statut || 'pending',
      data.methode,
      data.reference,
      data.metadata || {},
      data.donneesAPI || {},
    ]
  );
  return mapTransactionRow(rows[0]);
};

const getTransactionById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
  return mapTransactionRow(rows[0]);
};

const getTransactionByReference = async (reference) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM transactions WHERE reference = $1', [reference]);
  return mapTransactionRow(rows[0]);
};

const getUserTransactions = async (userId, page = 1, limit = 20) => {
  const pool = getPostgresPool();
  const offset = (page - 1) * limit;
  
  const [countResult, rows] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM transactions WHERE user_id = $1', [userId]),
    pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    ),
  ]);

  return {
    total: countResult.rows[0].total,
    page,
    totalPages: Math.ceil(countResult.rows[0].total / limit),
    transactions: rows.map(mapTransactionRow),
  };
};

const updateTransactionStatus = async (id, statut, donneesAPI) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `UPDATE transactions SET status = $2, provider_response = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, statut, donneesAPI || {}]
  );
  return mapTransactionRow(rows[0]);
};

module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionByReference,
  getUserTransactions,
  updateTransactionStatus,
};