require('dotenv').config();
const { getPostgresPool } = require('../config/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    console.log('Starting PostgreSQL migration...');

    const schemaPath = path.join(__dirname, '../sql/postgres-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query('BEGIN');

    console.log('Executing schema SQL...');
    await client.query(schemaSql);

    await client.query(`
      INSERT INTO plans_agriculteur (nom, duree, max_produits, restriction_categorie, prix)
      VALUES 
        ('BLEU', 30, 10, true, 0),
        ('GOLD', 30, 50, false, 5000),
        ('PLATINUM', 30, 999999, false, 10000)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    console.log('Tables created and initial data seeded.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}