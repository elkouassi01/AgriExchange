const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapPlanRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nom: row.nom,
    duree: row.duree,
    maxProduits: row.max_produits,
    restrictionCategorie: Boolean(row.restriction_categorie),
    prix: Number(row.prix),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getAllPlans = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM plans_agriculteur ORDER BY duree ASC');
  return rows.map(mapPlanRow);
};

const getPlanById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM plans_agriculteur WHERE id = ?', [id]);
  return mapPlanRow(rows[0]);
};

const getPlanByNom = async (nom) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM plans_agriculteur WHERE nom = ?', [nom]);
  return mapPlanRow(rows[0]);
};

const createPlan = async (data) => {
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO plans_agriculteur (id, nom, duree, max_produits, restriction_categorie, prix)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.nom, data.duree, data.maxProduits, data.restrictionCategorie ? 1 : 0, data.prix || 0]
  );
  return getPlanById(id);
};

const updatePlan = async (id, updates) => {
  const pool = getMysqlPool();
  const allowedFields = ['duree', 'max_produits', 'restriction_categorie', 'prix'];
  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (setClauses.length === 0) {
    return getPlanById(id);
  }

  values.push(id);
  await pool.query(
    `UPDATE plans_agriculteur SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return getPlanById(id);
};

module.exports = {
  getAllPlans,
  getPlanById,
  getPlanByNom,
  createPlan,
  updatePlan,
};
