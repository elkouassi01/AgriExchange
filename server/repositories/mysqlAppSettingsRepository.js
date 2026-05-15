const { getMysqlPool } = require('../config/mysql');

const get = async (key) => {
  const pool = getMysqlPool();
  const [[row]] = await pool.query('SELECT value FROM app_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
};

const set = async (key, value) => {
  const pool = getMysqlPool();
  await pool.query(
    'INSERT INTO app_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
    [key, value]
  );
};

const getMany = async (keys) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT `key`, value FROM app_settings WHERE `key` IN (?)', [keys]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
};

module.exports = { get, set, getMany };
