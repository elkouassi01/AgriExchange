const { getMysqlPool } = require('../config/mysql');

const normalizeRow = (row) => ({
  id: row.id,
  nom: row.nom,
  slug: row.slug,
  categorieValue: row.categorie_value,
  parentId: row.parent_id,
  ordre: row.ordre,
  actif: Boolean(row.actif),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const findAll = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM categories ORDER BY (parent_id IS NOT NULL), parent_id, ordre, nom'
  );
  return rows.map(normalizeRow);
};

const buildTree = (items, parentId = null) =>
  items
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom))
    .map((c) => ({ ...c, children: buildTree(items, c.id) }));

const findTree = async () => {
  const all = await findAll();
  return buildTree(all);
};

const findById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] ? normalizeRow(rows[0]) : null;
};

const create = async ({ nom, slug, categorieValue, parentId, ordre }) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    'INSERT INTO categories (nom, slug, categorie_value, parent_id, ordre) VALUES (?, ?, ?, ?, ?)',
    [nom, slug, categorieValue || null, parentId || null, ordre ?? 0]
  );
  return result.insertId;
};

const update = async (id, { nom, slug, categorieValue, parentId, ordre, actif }) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    'UPDATE categories SET nom=?, slug=?, categorie_value=?, parent_id=?, ordre=?, actif=? WHERE id=?',
    [nom, slug, categorieValue ?? null, parentId ?? null, ordre ?? 0, actif !== undefined ? (actif ? 1 : 0) : 1, id]
  );
  return result.affectedRows > 0;
};

const remove = async (id) => {
  const pool = getMysqlPool();
  // Orphan the children rather than cascade-delete them
  await pool.query('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [id]);
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { findAll, findTree, findById, create, update, remove };
