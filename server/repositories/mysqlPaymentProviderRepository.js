const { getMysqlPool } = require('../config/mysql');

// Returns all providers (without sensitive config)
const findAll = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT id, label, icon, description, enabled, position, updated_at FROM payment_providers ORDER BY position ASC'
  );
  return rows;
};

// Returns one provider WITH full config (for internal use only)
const findById = async (id) => {
  const pool = getMysqlPool();
  const [[row]] = await pool.query('SELECT * FROM payment_providers WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, config: row.config ? JSON.parse(row.config) : {} };
};

// Upsert a provider
const upsert = async (id, { label, icon, description, enabled, config, position }) => {
  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO payment_providers (id, label, icon, description, enabled, config, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       label = VALUES(label),
       icon = VALUES(icon),
       description = VALUES(description),
       enabled = VALUES(enabled),
       config = COALESCE(VALUES(config), config),
       position = VALUES(position),
       updated_at = NOW()`,
    [id, label, icon, description ?? '', enabled ? 1 : 0, config ? JSON.stringify(config) : null, position ?? 99]
  );
};

// Update only config + enabled (used from admin route)
const updateConfig = async (id, { enabled, config }) => {
  const pool = getMysqlPool();
  const sets = [];
  const vals = [];
  if (enabled !== undefined) { sets.push('enabled = ?'); vals.push(enabled ? 1 : 0); }
  if (config !== undefined) { sets.push('config = ?'); vals.push(JSON.stringify(config)); }
  if (!sets.length) return;
  sets.push('updated_at = NOW()');
  vals.push(id);
  await pool.query(`UPDATE payment_providers SET ${sets.join(', ')} WHERE id = ?`, vals);
};

module.exports = { findAll, findById, upsert, updateConfig };
