const { getPostgresPool } = require('../config/postgres');

const mapPlanRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nom: row.nom,
    duree: row.duree,
    maxProduits: row.max_produits,
    restrictionCategorie: row.restriction_categorie,
    prix: Number(row.prix),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getAllPlans = async () => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM plans_agriculteur ORDER BY duree ASC');
  return rows.map(mapPlanRow);
};

const getPlanById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM plans_agriculteur WHERE id = $1', [id]);
  return mapPlanRow(rows[0]);
};

const getPlanByNom = async (nom) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM plans_agriculteur WHERE nom = $1', [nom]);
  return mapPlanRow(rows[0]);
};

const createPlan = async (data) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO plans_agriculteur (nom, duree, max_produits, restriction_categorie, prix)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.nom, data.duree, data.maxProduits, data.restrictionCategorie || false, data.prix || 0]
  );
  return mapPlanRow(rows[0]);
};

const updatePlan = async (id, updates) => {
  const pool = getPostgresPool();
  const allowedFields = ['duree', 'max_produits', 'restriction_categorie', 'prix'];
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  });

  if (setClauses.length === 0) {
    return getPlanById(id);
  }

  values.push(id);

  const { rows } = await pool.query(
    `UPDATE plans_agriculteur SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} RETURNING *`,
    values
  );
  return mapPlanRow(rows[0]);
};

module.exports = {
  getAllPlans,
  getPlanById,
  getPlanByNom,
  createPlan,
  updatePlan,
};