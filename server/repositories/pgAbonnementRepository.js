const { getPostgresPool } = require('../config/postgres');

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
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO abonnements (
      utilisateur_id, formule, montant, date_debut, date_expiration, status, transaction_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.utilisateurId,
      data.formule,
      data.montant,
      data.dateDebut || new Date(),
      data.dateExpiration,
      data.status || 'active',
      data.transactionId,
    ]
  );
  return mapAbonnementRow(rows[0]);
};

const getAbonnementById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM abonnements WHERE id = $1', [id]);
  return mapAbonnementRow(rows[0]);
};

const getUserAbonnements = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    'SELECT * FROM abonnements WHERE utilisateur_id = $1 ORDER BY date_debut DESC',
    [userId]
  );
  return rows.map(mapAbonnementRow);
};

const getActiveUserAbonnement = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `SELECT * FROM abonnements 
     WHERE utilisateur_id = $1 AND date_expiration >= NOW() 
     ORDER BY date_debut DESC LIMIT 1`,
    [userId]
  );
  return mapAbonnementRow(rows[0]);
};

const updateAbonnement = async (id, updates) => {
  const pool = getPostgresPool();
  const allowedFields = ['formule', 'montant', 'status', 'date_expiration'];
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    const dbKey = key === 'dateExpiration' ? 'date_expiration' : key;
    if (allowedFields.includes(dbKey)) {
      setClauses.push(`${dbKey} = $${idx}`);
      values.push(value);
      idx++;
    }
  });

  if (setClauses.length === 0) {
    return getAbonnementById(id);
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE abonnements SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} RETURNING *`,
    values
  );
  return mapAbonnementRow(rows[0]);
};

const cancelAbonnement = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `UPDATE abonnements SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return mapAbonnementRow(rows[0]);
};

module.exports = {
  createAbonnement,
  getAbonnementById,
  getUserAbonnements,
  getActiveUserAbonnement,
  updateAbonnement,
  cancelAbonnement,
};