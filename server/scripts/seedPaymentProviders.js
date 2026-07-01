require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createConnection } = require('mysql2');

let c;

function query(sql, params) {
  return new Promise((resolve, reject) => {
    c.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function main() {
  c = createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || 'admin',
    database: process.env.MYSQL_DATABASE || 'agriexchange',
    multipleStatements: true,
  });
  await new Promise((resolve, reject) => c.connect((err) => (err ? reject(err) : resolve())));

  // Métadonnées des providers
  const meta = `
    INSERT INTO payment_providers (id, label, icon, description, enabled, position)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      label = VALUES(label),
      icon = VALUES(icon),
      description = VALUES(description),
      enabled = VALUES(enabled),
      position = VALUES(position)
  `;

  const providers = [
    ['cinetpay',        'CinetPay',           '💳', 'Paiement mobile money & cartes — CI et Afrique Ouest', 1, 1],
    ['cinetpay_legacy', 'CinetPay (Legacy)',   '🏦', 'Ancienne API CinetPay — apikey + site_id',             0, 2],
    ['paydunya',        'PayDunya',            '🔵', 'Passerelle de paiement Afrique Ouest',                 0, 3],
    ['stripe',          'Stripe',              '⚡', 'Paiement international par carte bancaire',            0, 4],
  ];

  for (const r of providers) await query(meta, r);
  console.log('[seed] Métadonnées providers insérées');

  // Injecter la config CinetPay depuis les variables d'environnement
  const apiKey  = process.env.CINETPAY_APIKEY;
  const apiPass = process.env.CINETPAY_API_PASSWORD;
  const country = process.env.CINETPAY_COUNTRY || 'CI';
  const env     = process.env.CINETPAY_ENV || 'production';

  if (apiKey && apiPass) {
    const config = JSON.stringify({ api_key: apiKey, api_password: apiPass, country, env });
    await query(
      `UPDATE payment_providers SET config = ?, updated_at = NOW() WHERE id = 'cinetpay'`,
      [config]
    );
    console.log('[seed] Config CinetPay injectée (api_key:', apiKey.substring(0, 12) + '…', '| pays:', country, '| env:', env + ')');
  } else {
    console.warn('[seed] CINETPAY_APIKEY ou CINETPAY_API_PASSWORD absent du .env — config non injectée');
  }

  c.end();
  console.log('[seed] Terminé');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
