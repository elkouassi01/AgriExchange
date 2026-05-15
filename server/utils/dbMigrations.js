const { getMysqlPool } = require('../config/mysql');

// Colonnes ajoutees apres le schema initial
const REQUIRED_COLUMNS = [
  { table: 'users',    column: 'description',        definition: 'TEXT NULL' },
  { table: 'users',    column: 'surface',             definition: 'VARCHAR(100) NULL' },
  { table: 'products', column: 'paid_sponsor_until',  definition: 'DATETIME NULL' },
  { table: 'products', column: 'moderation_status',   definition: "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'" },
  { table: 'products', column: 'moderation_note',     definition: 'TEXT NULL' },
  { table: 'products', column: 'moderated_by',        definition: 'CHAR(36) NULL' },
  { table: 'products', column: 'moderated_at',        definition: 'DATETIME NULL' },
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

const ensureMessagesSenderNullable = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT IS_NULLABLE FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'messages' AND column_name = 'sender_id'`
  );
  if (rows.length && rows[0].IS_NULLABLE === 'NO') {
    try {
      await pool.query('ALTER TABLE messages MODIFY sender_id CHAR(36) NULL');
      console.log('[DB] messages.sender_id rendu nullable');
    } catch (e) {
      console.warn('[DB] Erreur modification messages.sender_id:', e.message.split('\n')[0]);
    }
  }
};

const ensureAuditLogsTable = async () => {
  const pool = getMysqlPool();
  if (await tableExists(pool, 'admin_audit_logs')) return;
  try {
    await pool.query(`
      CREATE TABLE admin_audit_logs (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        admin_id    CHAR(36)     NOT NULL,
        admin_nom   VARCHAR(255),
        action      VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id   VARCHAR(36),
        target_label VARCHAR(255),
        details     JSON,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_admin_id   (admin_id),
        INDEX idx_audit_created_at (created_at),
        INDEX idx_audit_action     (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[DB] Table créée: admin_audit_logs');
  } catch (e) {
    console.warn('[DB] Table ignorée: admin_audit_logs —', e.message.split('\n')[0]);
  }
};

const ensureCategoriesTable = async () => {
  const pool = getMysqlPool();
  if (await tableExists(pool, 'categories')) return;
  try {
    await pool.query(`
      CREATE TABLE categories (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nom             VARCHAR(100) NOT NULL,
        slug            VARCHAR(100) NOT NULL,
        categorie_value VARCHAR(100) NULL,
        parent_id       INT NULL,
        ordre           INT NOT NULL DEFAULT 0,
        actif           TINYINT(1) NOT NULL DEFAULT 1,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_categories_slug (slug),
        INDEX idx_categories_parent_id (parent_id),
        INDEX idx_categories_actif (actif)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[DB] Table créée: categories');

    // Données par défaut
    await pool.query(`
      INSERT INTO categories (id, nom, slug, categorie_value, parent_id, ordre) VALUES
        (1,  'Vivriers',     'vivriers',     NULL,           NULL, 1),
        (2,  'Élevage',      'elevage',      NULL,           NULL, 2),
        (3,  'Dérivé',       'derive',       NULL,           NULL, 3),
        (4,  'Légumes',      'legumes',      'légumes',      1,    1),
        (5,  'Fruits',       'fruits',       'fruits',       1,    2),
        (6,  'Tubercules',   'tubercules',   'tubercules',   1,    3),
        (7,  'Céréales',     'cereales',     'céréales',     1,    4),
        (8,  'Bovin',        'bovin',        'viandes',      2,    1),
        (9,  'Volaille',     'volaille',     'volaille',     2,    2),
        (10, 'Pisciculture', 'pisciculture', 'pisciculture', 2,    3)
    `);
    console.log('[DB] Catégories par défaut insérées');
  } catch (e) {
    console.warn('[DB] Table ignorée: categories —', e.message.split('\n')[0]);
  }
};

const ensureAppSettingsTable = async () => {
  const pool = getMysqlPool();
  if (await tableExists(pool, 'app_settings')) return;
  try {
    await pool.query(`
      CREATE TABLE app_settings (
        \`key\`      VARCHAR(100) NOT NULL PRIMARY KEY,
        value       TEXT         NULL,
        updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[DB] Table créée: app_settings');
  } catch (e) {
    console.warn('[DB] Table ignorée: app_settings —', e.message.split('\n')[0]);
  }
};

const ensurePaymentProvidersTable = async () => {
  const pool = getMysqlPool();
  if (await tableExists(pool, 'payment_providers')) return;
  try {
    await pool.query(`
      CREATE TABLE payment_providers (
        id          VARCHAR(50)  NOT NULL PRIMARY KEY,
        label       VARCHAR(100) NOT NULL,
        icon        VARCHAR(20)  DEFAULT '💳',
        description VARCHAR(255) DEFAULT '',
        enabled     TINYINT(1)   NOT NULL DEFAULT 0,
        config      TEXT         NULL,
        position    INT          NOT NULL DEFAULT 99,
        updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[DB] Table créée: payment_providers');

    await pool.query(`
      INSERT INTO payment_providers (id, label, icon, description, enabled, position) VALUES
        ('cinetpay',        'CinetPay',          '💳', 'Paiement mobile money & cartes — Côte d\'Ivoire et Afrique de l\'Ouest', 1, 1),
        ('cinetpay_legacy', 'CinetPay (Legacy)',  '🏦', 'Ancienne API CinetPay — apikey + site_id',                               0, 2),
        ('paydunya',        'PayDunya',           '🔵', 'Passerelle de paiement Afrique de l\'Ouest',                             0, 3),
        ('stripe',          'Stripe',             '⚡', 'Paiement international par carte bancaire',                               0, 4)
    `);
    console.log('[DB] Providers de paiement initialisés');
  } catch (e) {
    console.warn('[DB] Table ignorée: payment_providers —', e.message.split('\n')[0]);
  }
};

const ensureSellerReviewsTable = async () => {
  const pool = getMysqlPool();
  if (await tableExists(pool, 'seller_reviews')) {
    // Renommer reviewer_id → buyer_id si l'ancienne colonne existe encore
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'seller_reviews' AND column_name = 'reviewer_id'`
    );
    if (cols.length > 0) {
      try {
        await pool.query('ALTER TABLE seller_reviews CHANGE reviewer_id buyer_id CHAR(36) NOT NULL');
        console.log('[DB] seller_reviews.reviewer_id renommé en buyer_id');
      } catch (e) {
        console.warn('[DB] Renommage seller_reviews.reviewer_id ignoré —', e.message.split('\n')[0]);
      }
    }
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE seller_reviews (
        id          CHAR(36)     NOT NULL PRIMARY KEY,
        seller_id   CHAR(36)     NOT NULL,
        buyer_id    CHAR(36)     NOT NULL,
        rating      TINYINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     TEXT         NULL,
        created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_review_seller_buyer (seller_id, buyer_id),
        INDEX idx_reviews_seller_id (seller_id),
        INDEX idx_reviews_buyer_id  (buyer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[DB] Table créée: seller_reviews');
  } catch (e) {
    console.warn('[DB] Table ignorée: seller_reviews —', e.message.split('\n')[0]);
  }
};

module.exports = { ensureIndexes, ensureColumns, ensureAuditLogsTable, ensureMessagesSenderNullable, ensureCategoriesTable, ensureSellerReviewsTable, ensureAppSettingsTable, ensurePaymentProvidersTable };
