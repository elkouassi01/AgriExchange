/**
 * Script de migration automatique — VivriMarket Production
 * Usage : node server/scripts/migrate-prod.js
 *
 * Ce script est IDEMPOTENT : il peut être relancé plusieurs fois
 * sans risque. Il ne fait que des CREATE TABLE IF NOT EXISTS et
 * des ALTER TABLE ADD COLUMN IF NOT EXISTS.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

// ── Config ────────────────────────────────────────────────────────────────────
const DB_CONFIG = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT || '3306'),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'agriexchange',
  charset:  'utf8mb4',
  multipleStatements: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok  = (msg) => console.log(`  \x1b[32m✓\x1b[0m  ${msg}`);
const warn = (msg) => console.log(`  \x1b[33m⚠\x1b[0m  ${msg}`);
const info = (msg) => console.log(`  \x1b[36m→\x1b[0m  ${msg}`);
const err  = (msg) => console.log(`  \x1b[31m✗\x1b[0m  ${msg}`);

const header = (title) => {
  console.log('');
  console.log(`\x1b[1m\x1b[34m── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}\x1b[0m`);
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return rows[0].cnt > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    ok(`${table}.${column} — déjà présent`);
    return;
  }
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    ok(`${table}.${column} — ajouté (${definition})`);
  } catch (e) {
    warn(`${table}.${column} — ignoré : ${e.message.split('\n')[0]}`);
  }
}

async function createIndexIfMissing(conn, table, indexName, cols) {
  if (await indexExists(conn, table, indexName)) {
    ok(`index ${indexName} — déjà présent`);
    return;
  }
  try {
    await conn.query(`CREATE INDEX \`${indexName}\` ON \`${table}\`(${cols})`);
    ok(`index ${indexName} — créé`);
  } catch (e) {
    warn(`index ${indexName} — ignoré : ${e.message.split('\n')[0]}`);
  }
}

// ── Migration principale ──────────────────────────────────────────────────────
async function run() {
  console.log('\n\x1b[1mVivriMarket — Migration production\x1b[0m');
  console.log(`Base : ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);

  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    ok('Connexion MySQL établie');
  } catch (e) {
    err(`Impossible de se connecter : ${e.message}`);
    process.exit(1);
  }

  // ── 1. Tables principales ─────────────────────────────────────────────────
  header('1. Tables principales');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                CHAR(36)     NOT NULL,
      nom               VARCHAR(50)  NOT NULL,
      email             VARCHAR(255) NOT NULL,
      mot_de_passe      TEXT         NOT NULL,
      contact           VARCHAR(30)  NOT NULL,
      role              VARCHAR(20)  NOT NULL DEFAULT 'consommateur',
      ferme_nom         VARCHAR(120),
      localisation      VARCHAR(255),
      type_exploitation VARCHAR(50),
      photo             TEXT,
      description       TEXT,
      surface           VARCHAR(100),
      otp               VARCHAR(10),
      otp_expire        DATETIME,
      is_verified       TINYINT(1)   NOT NULL DEFAULT 0,
      est_actif         TINYINT(1)   NOT NULL DEFAULT 1,
      suspended         TINYINT(1)   NOT NULL DEFAULT 0,
      date_creation     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      derniere_connexion DATETIME,
      created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email   (email),
      UNIQUE KEY uq_users_contact (contact)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table users');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id                 CHAR(36)      NOT NULL,
      seller_id          CHAR(36)      NOT NULL,
      nom                VARCHAR(100)  NOT NULL,
      prix               DECIMAL(12,2) NOT NULL,
      description        TEXT,
      image_url          TEXT,
      categorie          VARCHAR(50)   NOT NULL,
      stock              INT           NOT NULL DEFAULT 0,
      unite              VARCHAR(30)   NOT NULL DEFAULT 'kg',
      date_recolte       DATE          NOT NULL,
      mensurations       VARCHAR(100),
      etat               VARCHAR(50)   NOT NULL DEFAULT 'frais',
      tags               JSON,
      certifications     JSON,
      is_featured        TINYINT(1)    NOT NULL DEFAULT 0,
      paid_sponsor_until DATETIME      NULL,
      rating             DECIMAL(3,1)  NOT NULL DEFAULT 0,
      views              INT           NOT NULL DEFAULT 0,
      created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_prod_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table products');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS abonnements (
      id              CHAR(36)      NOT NULL,
      user_id         CHAR(36)      NOT NULL,
      plan            VARCHAR(20)   NOT NULL DEFAULT 'BLEU',
      status          VARCHAR(20)   NOT NULL DEFAULT 'actif',
      date_debut      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      date_expiration DATETIME,
      montant         DECIMAL(12,2) NOT NULL DEFAULT 0,
      transaction_id  VARCHAR(120),
      created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_abn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table abonnements');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INT           NOT NULL AUTO_INCREMENT,
      sender_id   CHAR(36)      NOT NULL,
      receiver_id CHAR(36)      NOT NULL,
      texte       TEXT          NOT NULL,
      lu          TINYINT(1)    NOT NULL DEFAULT 0,
      produit_id  CHAR(36)      NULL,
      created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_msg_sender   (sender_id),
      INDEX idx_msg_receiver (receiver_id),
      INDEX idx_msg_lu       (lu),
      INDEX idx_msg_conv     (sender_id, receiver_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table messages');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id           INT           NOT NULL AUTO_INCREMENT,
      buyer_id     CHAR(36)      NOT NULL,
      seller_id    CHAR(36)      NOT NULL,
      product_id   CHAR(36),
      buyer_phone  VARCHAR(30),
      seller_phone VARCHAR(30),
      status       VARCHAR(20)   NOT NULL DEFAULT 'pending',
      created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_cr_buyer  FOREIGN KEY (buyer_id)  REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_cr_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table contact_requests');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_payments (
      id             CHAR(36)      NOT NULL,
      product_id     CHAR(36)      NOT NULL,
      buyer_id       CHAR(36)      NOT NULL,
      seller_id      CHAR(36)      NOT NULL,
      transaction_id VARCHAR(120)  NOT NULL UNIQUE,
      amount         DECIMAL(12,2) NOT NULL,
      status         VARCHAR(20)   NOT NULL DEFAULT 'pending',
      created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_pp_buyer   FOREIGN KEY (buyer_id)   REFERENCES users(id)    ON DELETE CASCADE,
      CONSTRAINT fk_pp_seller  FOREIGN KEY (seller_id)  REFERENCES users(id)    ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table product_payments');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS seller_reviews (
      id         CHAR(36)      NOT NULL,
      seller_id  CHAR(36)      NOT NULL,
      buyer_id   CHAR(36)      NOT NULL,
      product_id CHAR(36),
      note       TINYINT       NOT NULL,
      commentaire TEXT,
      created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_rev_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_rev_buyer  FOREIGN KEY (buyer_id)  REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_rev_seller (seller_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table seller_reviews');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_views (
      id         INT      NOT NULL AUTO_INCREMENT,
      product_id CHAR(36) NOT NULL,
      viewer_id  CHAR(36),
      ip         VARCHAR(45),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_pv_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table product_views');

  // ── 2. Nouvelle table — sponsoring payant ──────────────────────────────────
  header('2. Table sponsoring payant');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_sponsor_payments (
      id             CHAR(36)      NOT NULL,
      product_id     CHAR(36)      NOT NULL,
      seller_id      CHAR(36)      NOT NULL,
      transaction_id VARCHAR(120)  NOT NULL UNIQUE,
      amount         DECIMAL(12,2) NOT NULL DEFAULT 5000,
      status         ENUM('pending','active','expired','failed') NOT NULL DEFAULT 'pending',
      start_date     DATETIME      NULL,
      end_date       DATETIME      NULL,
      created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_psp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_psp_seller  FOREIGN KEY (seller_id)  REFERENCES users(id)    ON DELETE CASCADE,
      INDEX idx_psp_tx     (transaction_id),
      INDEX idx_psp_prod   (product_id),
      INDEX idx_psp_seller (seller_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ok('table product_sponsor_payments');

  // ── 3. Colonnes ajoutées post-schema initial ──────────────────────────────
  header('3. Colonnes ajoutées (ALTER TABLE)');

  const COLUMNS = [
    // users
    { table: 'users',    column: 'photo',              def: 'TEXT NULL' },
    { table: 'users',    column: 'description',        def: 'TEXT NULL' },
    { table: 'users',    column: 'surface',            def: 'VARCHAR(100) NULL' },
    { table: 'users',    column: 'suspended',          def: 'TINYINT(1) NOT NULL DEFAULT 0' },
    // products
    { table: 'products', column: 'rating',             def: 'DECIMAL(3,1) NOT NULL DEFAULT 0' },
    { table: 'products', column: 'views',              def: 'INT NOT NULL DEFAULT 0' },
    { table: 'products', column: 'is_featured',        def: 'TINYINT(1) NOT NULL DEFAULT 0' },
    { table: 'products', column: 'paid_sponsor_until', def: 'DATETIME NULL' },
    { table: 'products', column: 'tags',               def: 'JSON NULL' },
    { table: 'products', column: 'certifications',     def: 'JSON NULL' },
    { table: 'products', column: 'mensurations',       def: 'VARCHAR(100) NULL' },
  ];

  for (const { table, column, def } of COLUMNS) {
    await addColumnIfMissing(conn, table, column, def);
  }

  // ── 4. Index de performance ───────────────────────────────────────────────
  header('4. Index de performance');

  const INDEXES = [
    { table: 'products',              name: 'idx_products_etat',               cols: 'etat' },
    { table: 'products',              name: 'idx_products_stock',              cols: 'stock' },
    { table: 'products',              name: 'idx_products_created_at',         cols: 'created_at' },
    { table: 'products',              name: 'idx_products_is_featured',        cols: 'is_featured' },
    { table: 'products',              name: 'idx_products_paid_sponsor',       cols: 'paid_sponsor_until' },
    { table: 'abonnements',           name: 'idx_abonnements_date_expiration', cols: 'date_expiration' },
    { table: 'abonnements',           name: 'idx_abonnements_status',          cols: 'status' },
    { table: 'users',                 name: 'idx_users_est_actif',             cols: 'est_actif' },
    { table: 'users',                 name: 'idx_users_suspended',             cols: 'suspended' },
    { table: 'contact_requests',      name: 'idx_cr_status',                   cols: 'status' },
    { table: 'contact_requests',      name: 'idx_cr_seller_phone',             cols: 'seller_phone' },
    { table: 'product_payments',      name: 'idx_pp_status',                   cols: 'status' },
    { table: 'product_payments',      name: 'idx_pp_transaction_id',           cols: 'transaction_id' },
    { table: 'product_sponsor_payments', name: 'idx_psp_status',              cols: 'status' },
    { table: 'product_sponsor_payments', name: 'idx_psp_end_date',            cols: 'end_date' },
  ];

  for (const { table, name, cols } of INDEXES) {
    if (await tableExists(conn, table)) {
      await createIndexIfMissing(conn, table, name, cols);
    } else {
      warn(`index ${name} ignoré — table ${table} introuvable`);
    }
  }

  // ── 5. Vérification finale ────────────────────────────────────────────────
  header('5. Vérification finale');

  const EXPECTED_TABLES = [
    'users', 'products', 'abonnements', 'messages', 'contact_requests',
    'product_payments', 'seller_reviews', 'product_views', 'product_sponsor_payments',
  ];

  let allOk = true;
  for (const table of EXPECTED_TABLES) {
    const exists = await tableExists(conn, table);
    if (exists) {
      ok(`table ${table}`);
    } else {
      err(`table ${table} — MANQUANTE`);
      allOk = false;
    }
  }

  // Vérifier les colonnes critiques
  const CRITICAL_COLS = [
    { table: 'products', column: 'is_featured' },
    { table: 'products', column: 'paid_sponsor_until' },
    { table: 'messages', column: 'lu' },
    { table: 'users',    column: 'suspended' },
  ];
  for (const { table, column } of CRITICAL_COLS) {
    const exists = await columnExists(conn, table, column);
    if (exists) {
      ok(`${table}.${column}`);
    } else {
      err(`${table}.${column} — MANQUANTE`);
      allOk = false;
    }
  }

  await conn.end();

  console.log('');
  if (allOk) {
    console.log('\x1b[32m\x1b[1m✅  Migration terminée avec succès — serveur prêt.\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\x1b[31m\x1b[1m❌  Certains éléments sont manquants — vérifiez les erreurs ci-dessus.\x1b[0m\n');
    process.exit(1);
  }
}

run().catch((e) => {
  err(`Erreur fatale : ${e.message}`);
  process.exit(1);
});
