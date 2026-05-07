const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapAbonnementRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    utilisateurId: row.utilisateur_id,
    formule: row.formule,
    montant: Number(row.montant),
    dateDebut: row.date_debut,
    dateExpiration: row.date_expiration,
    status: row.status,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createAbonnement = async (data) => {
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO abonnements (
      id, utilisateur_id, formule, montant, date_debut, date_expiration, status, transaction_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.utilisateurId,
      data.formule,
      data.montant,
      data.dateDebut || new Date(),
      data.dateExpiration,
      data.status || 'active',
      data.transactionId || null,
    ]
  );
  return getAbonnementById(id);
};

const getAbonnementById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM abonnements WHERE id = ?', [id]);
  return mapAbonnementRow(rows[0]);
};

const getUserAbonnements = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM abonnements WHERE utilisateur_id = ? ORDER BY date_debut DESC',
    [userId]
  );
  return rows.map(mapAbonnementRow);
};

const getActiveUserAbonnement = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT * FROM abonnements
     WHERE utilisateur_id = ? AND date_expiration >= NOW()
     ORDER BY date_debut DESC LIMIT 1`,
    [userId]
  );
  return mapAbonnementRow(rows[0]);
};

const updateAbonnement = async (id, updates) => {
  const pool = getMysqlPool();
  const allowedFields = ['formule', 'montant', 'status', 'date_expiration'];
  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    const dbKey = key === 'dateExpiration' ? 'date_expiration' : key;
    if (allowedFields.includes(dbKey)) {
      setClauses.push(`${dbKey} = ?`);
      values.push(value);
    }
  });

  if (setClauses.length === 0) {
    return getAbonnementById(id);
  }

  values.push(id);
  await pool.query(
    `UPDATE abonnements SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return getAbonnementById(id);
};

const cancelAbonnement = async (id) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE abonnements SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
    [id]
  );
  return getAbonnementById(id);
};

module.exports = {
  createAbonnement,
  getAbonnementById,
  getUserAbonnements,
  getActiveUserAbonnement,
  updateAbonnement,
  cancelAbonnement,
};
