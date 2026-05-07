require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getMysqlPool, testMysqlConnection } = require('../config/mysql');

const schemaPath = path.join(__dirname, '..', 'sql', 'mysql-schema.sql');

async function runMigration() {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    await testMysqlConnection();
    console.log('Starting MySQL migration...');

    // Strip comment lines before splitting so they don't mask CREATE TABLE statements
    const sql = fs.readFileSync(schemaPath, 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    await conn.beginTransaction();

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);
    for (const statement of statements) {
      await conn.query(statement);
    }

    // Seed default plans
    const { randomUUID } = require('crypto');
    const plans = [
      { nom: 'BLEU',     duree: 30, max_produits: 10,     restriction_categorie: 1, prix: 0 },
      { nom: 'GOLD',     duree: 30, max_produits: 50,     restriction_categorie: 0, prix: 5000 },
      { nom: 'PLATINUM', duree: 30, max_produits: 999999, restriction_categorie: 0, prix: 10000 },
    ];

    for (const plan of plans) {
      const [existing] = await conn.query(
        'SELECT id FROM plans_agriculteur WHERE nom = ?',
        [plan.nom]
      );
      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO plans_agriculteur (id, nom, duree, max_produits, restriction_categorie, prix)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), plan.nom, plan.duree, plan.max_produits, plan.restriction_categorie, plan.prix]
        );
        console.log(`  Plan ${plan.nom} created.`);
      } else {
        console.log(`  Plan ${plan.nom} already exists, skipped.`);
      }
    }

    await conn.commit();
    console.log('Migration completed successfully!');
    console.log('Tables created and initial data seeded.');
  } catch (error) {
    await conn.rollback();
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}
