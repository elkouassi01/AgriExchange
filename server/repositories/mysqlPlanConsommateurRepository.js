const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

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
  const pool = getMysqlPool();
  const id = randomUUID();
  const dateDebut = data.dateDebut ? new Date(data.dateDebut) : new Date();
  const dateFin = new Date(dateDebut);
  dateFin.setMonth(dateFin.getMonth() + (data.dureeMois || 0));

  await pool.query(
    `INSERT INTO plans_consommateur (
      id, utilisateur_id, forfait, date_debut, duree_mois, date_fin, acces_vendeurs_max, statut
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.utilisateurId,
      data.forfait,
      dateDebut,
      data.dureeMois,
      dateFin,
      data.accesVendeursMax,
      data.statut || 'actif',
    ]
  );
  return getPlanById(id);
};

const getPlanById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM plans_consommateur WHERE id = ?', [id]);
  return mapPlanConsommateurRow(rows[0]);
};

const getUserPlan = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM plans_consommateur WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const getActiveUserPlan = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT * FROM plans_consommateur
     WHERE utilisateur_id = ? AND statut = 'actif' AND date_fin > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return mapPlanConsommateurRow(rows[0]);
};

const updatePlanStatut = async (id, statut) => {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE plans_consommateur SET statut = ?, updated_at = NOW() WHERE id = ?`,
    [statut, id]
  );
  return getPlanById(id);
};

const deletePlan = async (id) => {
  const pool = getMysqlPool();
  const [result] = await pool.query('DELETE FROM plans_consommateur WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createPlan,
  getPlanById,
  getUserPlan,
  getActiveUserPlan,
  updatePlanStatut,
  deletePlan,
};
