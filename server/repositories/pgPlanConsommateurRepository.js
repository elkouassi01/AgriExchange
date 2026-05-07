const { getPostgresPool } = require('../config/postgres');

const mapPlanConsommateurRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    utilisateurId: row.utilisateur_id,
    forfait: row.forfait,
    dateDebut: row.date_debut,
    dureeMois: row.duree_mois,
    dateFin: row.date_fin,
    accesVendeursMax: row.acces_vendeurs_max,
    statut: row.statut,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createPlan = async (data) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO plans_consommateur (
      utilisateur_id, forfait, date_debut, duree_mois, acces_vendeurs_max, statut
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.utilisateurId,
      data.forfait,
      data.dateDebut || new Date(),
      data.dureeMois,
      data.accesVendeursMax,
      data.statut || 'actif',
    ]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const getPlanById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM plans_consommateur WHERE id = $1', [id]);
  return mapPlanConsommateurRow(rows[0]);
};

const getUserPlan = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    'SELECT * FROM plans_consommateur WHERE utilisateur_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const getActiveUserPlan = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `SELECT * FROM plans_consommateur 
     WHERE utilisateur_id = $1 AND statut = 'actif' AND date_fin > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const updatePlanStatut = async (id, statut) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `UPDATE plans_consommateur SET statut = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, statut]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const deletePlan = async (id) => {
  const pool = getPostgresPool();
  const { rowCount } = await pool.query('DELETE FROM plans_consommateur WHERE id = $1', [id]);
  return rowCount > 0;
};

module.exports = {
  createPlan,
  getPlanById,
  getUserPlan,
  getActiveUserPlan,
  updatePlanStatut,
  deletePlan,
};