const { getMysqlPool } = require('../config/mysql');

// Colonnes ajoutees apres le schema initial
const REQUIRED_COLUMNS = [
  { table: 'users', column: 'description', definition: 'TEXT NULL' },
  { table: 'users', column: 'surface',     definition: 'VARCHAR(100) NULL' },
];

const columnExists = async (pool, table, column) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  return rows[0].cnt > 0;
};

const ensureColumn = async (pool, table, column, definition) => {
  if (await columnExists(pool, table, column)) return;
  try {
    await pool.query('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);
    console.log('[DB] Colonne ajoutee: ' + table + '.' + column);
  } catch (e) {
    console.warn('[DB] Colonne ignoree: ' + table + '.' + column + ' — ' + e.message.split('\n')[0]);
  }
};

const ensureColumns = async () => {
  const pool = getMysqlPool();
  for (const { table, column, definition } of REQUIRED_COLUMNS) {
    await ensureColumn(pool, table, column, definition);
  }
};

// Index absents du schema initial — crees une seule fois au demarrage
const REQUIRED_INDEXES = [
  { table: 'products',     name: 'idx_products_etat',              cols: 'etat' },
  { table: 'products',     name: 'idx_products_stock',             cols: 'stock' },
  { table: 'products',     name: 'idx_products_created_at',        cols: 'created_at' },
  { table: 'abonnements',  name: 'idx_abonnements_date_expiration', cols: 'date_expiration' },
  { table: 'abonnements',  name: 'idx_abonnements_status',         cols: 'status' },
  { table: 'users',        name: 'idx_users_est_actif',            cols: 'est_actif' },
  { table: 'users',        name: 'idx_users_suspended',            cols: 'suspended' },
  { table: 'transactions', name: 'idx_transactions_status',        cols: 'status' },
];

// Index crees uniquement si la table existe deja (tables optionnelles)
const OPTIONAL_INDEXES = [
  { table: 'contact_requests', name: 'idx_cr_status',            cols: 'status' },
  { table: 'contact_requests', name: 'idx_cr_seller_phone',      cols: 'seller_phone' },
  { table: 'product_payments', name: 'idx_pp_status',            cols: 'status' },
  { table: 'product_payments', name: 'idx_pp_transaction_id',    cols: 'transaction_id' },
];

const tableExists = async (pool, table) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [table]
  );
  return rows[0].cnt > 0;
};

const indexExists = async (pool, table, name) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, name]
  );
  return rows[0].cnt > 0;
};

const createIndex = async (pool, table, name, cols) => {
  if (await indexExists(pool, table, name)) return;
  try {
    await pool.query('CREATE INDEX ' + name + ' ON ' + table + '(' + cols + ')');
    console.log('[DB] Index cree: ' + name);
  } catch (e) {
    // Colonne inexistante (ex: suspended pas encore ajoutee) — ignoré
    console.warn('[DB] Index ignore: ' + name + ' — ' + e.message.split('\n')[0]);
  }
};

const ensureIndexes = async () => {
  const pool = getMysqlPool();

  for (const { table, name, cols } of REQUIRED_INDEXES) {
    await createIndex(pool, table, name, cols);
  }

  for (const { table, name, cols } of OPTIONAL_INDEXES) {
    if (await tableExists(pool, table)) {
      await createIndex(pool, table, name, cols);
    }
  }
};

module.exports = { ensureIndexes, ensureColumns };
