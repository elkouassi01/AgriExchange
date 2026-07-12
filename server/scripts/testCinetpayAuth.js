const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { CinetPayClient, AuthenticationError } = require('cinetpay-js');

function getPkgVersion(name) {
  try {
    for (const dir of require.resolve.paths(name) || []) {
      const pkgPath = path.join(dir, name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
      }
    }
  } catch { /* ignore */ }
  return 'inconnue';
}
const SDK_VERSION = getPkgVersion('cinetpay-js');

const apiKey  = process.env.CINETPAY_APIKEY;
const apiPass = process.env.CINETPAY_API_PASSWORD;
const country = process.env.CINETPAY_COUNTRY || 'CI';
const env     = process.env.CINETPAY_ENV || 'sandbox';
const baseUrl = env === 'sandbox' ? 'https://api.cinetpay.net' : 'https://api.cinetpay.co';

// Capture tous les logs internes du SDK (requêtes/réponses HTTP, y compris le détail
// que l'AuthenticationError masque volontairement) pour produire un rapport exploitable
// par le support CinetPay — sans jamais logger les credentials en clair (le SDK les
// masque déjà dans sanitizeBody, on masque en plus la clé API ici par précaution).
const reportLines = [];
function maskSecrets(str) {
  return apiKey ? str.split(apiKey).join(apiKey.substring(0, 12) + '…[masqué]') : str;
}
function record(level, message, data) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}${data !== undefined ? ' ' + safeStringify(data) : ''}`;
  reportLines.push(maskSecrets(line));
}
function safeStringify(data) {
  try { return JSON.stringify(data); } catch { return String(data); }
}
const captureLogger = {
  debug: (msg, data) => record('debug', msg, data),
  warn:  (msg, data) => record('warn', msg, data),
  error: (msg, data) => record('error', msg, data),
};

// Numéros de test sandbox CinetPay (Côte d'Ivoire) — doc CinetPay "Numéros de test"
const TEST_NUMBERS = [
  { phone: '+2250707070700', expected: 'SUCCESS', description: 'Succès immédiat' },
  { phone: '+2250707070701', expected: 'SUCCESS', description: 'Pending 3s puis succès' },
  { phone: '+2250707070703', expected: 'FAILED',  description: 'Échec immédiat' },
  { phone: '+2250707070704', expected: 'FAILED',  description: 'Pending 3s puis échec' },
  { phone: '+2250707070706', expected: 'PENDING', description: 'Pending infini' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('=== Test CinetPay v1 — sandbox ===');
console.log('  apiKey :', apiKey?.substring(0, 16) + '…');
console.log('  env    :', env, '->', baseUrl);
console.log('  country:', country);
console.log('');

if (env !== 'sandbox') {
  console.error('⚠️  CINETPAY_ENV doit être "sandbox" pour utiliser les numéros de test ci-dessous.');
  console.error('   (les tester en production débiterait de vrais numéros de mobile money)');
  process.exit(1);
}

const client = new CinetPayClient({
  credentials: {
    [country]: { apiKey, apiPassword: apiPass },
  },
  baseUrl,
  logger: captureLogger,
});

// Interroge le statut jusqu'à un état non-PENDING, ou jusqu'à maxAttempts
// (utile pour les numéros "pending puis succès/échec" qui basculent après ~3s,
// et pour observer le cas "pending infini" sans bloquer indéfiniment).
const NON_FINAL_STATUSES = new Set(['PENDING', 'INITIATED']);
async function pollStatus(transactionId, { maxAttempts = 6, intervalMs = 2000 } = {}) {
  let result;
  for (let i = 0; i < maxAttempts; i++) {
    result = await client.payment.getStatus(transactionId, country);
    if (!NON_FINAL_STATUSES.has(result.status)) return result;
    if (i < maxAttempts - 1) await sleep(intervalMs);
  }
  return result;
}

function logErrorDetails(e, indent = '   ') {
  console.log(`${indent}type       :`, e.constructor.name);
  console.log(`${indent}message    :`, e.message);
  if (e.apiCode !== undefined)   console.log(`${indent}apiCode    :`, e.apiCode);
  if (e.apiStatus !== undefined) console.log(`${indent}apiStatus  :`, e.apiStatus);
  if (e.description !== undefined) console.log(`${indent}description:`, e.description);
  if (e.cause !== undefined)     console.log(`${indent}cause      :`, e.cause?.message || e.cause);
}

async function testAuth() {
  console.log('--- 0. Authentification ---');
  try {
    await client.payment.getStatus('TEST_AUTH', country);
    console.log('✅ Authentification OK (transaction TEST_AUTH trouvée, inattendu mais sans gravité)\n');
    return true;
  } catch (e) {
    if (e instanceof AuthenticationError) {
      console.log('❌ Authentification ÉCHOUÉE');
      logErrorDetails(e);
      console.log('');
      return false;
    }
    // Toute autre erreur (ex: 404 "transaction TEST_AUTH introuvable") signifie qu'on
    // a passé l'authentification — le token a été obtenu, seule la requête suivante échoue.
    console.log('✅ Authentification OK (le token a été obtenu — erreur suivante normale car TEST_AUTH n\'est pas une vraie transaction)');
    logErrorDetails(e);
    console.log('');
    return true;
  }
}

async function testNumber({ phone, expected, description }) {
  const transactionId = 'VIVRITEST' + Date.now() + phone.slice(-4);
  console.log(`--- ${phone} (${description}) — attendu: ${expected} ---`);
  try {
    const initResult = await client.payment.initialize({
      currency: 'XOF',
      merchantTransactionId: transactionId,
      amount: 500,
      lang: 'fr',
      designation: 'Test sandbox VivriMarket',
      clientFirstName: 'Test',
      clientLastName: 'Sandbox',
      clientEmail: 'test@vivrimarket.com',
      clientPhoneNumber: phone,
      successUrl: 'https://vivrimarket.com/paiement-reussi',
      failedUrl: 'https://vivrimarket.com/paiement-echec',
      notifyUrl: 'https://vivrimarket.com/api/v1/cinetpay-notify',
      channel: 'PUSH',
    }, country);

    const result = await pollStatus(transactionId);
    if (result.status === expected) {
      console.log(`  ✅ statut obtenu: ${result.status}`);
    } else if (NON_FINAL_STATUSES.has(result.status)) {
      // Le sandbox CinetPay ne résout automatiquement les numéros de test que lorsque
      // la page de paiement hébergée (paymentUrl) est réellement ouverte dans un
      // navigateur (SPA JS) — un simple appel API ne suffit pas à simuler le clic.
      console.log(`  ⏳ statut obtenu: ${result.status} — ouvrez l'URL ci-dessous dans un navigateur pour déclencher la simulation :`);
      console.log(`     ${initResult.paymentUrl}`);
    } else {
      console.log(`  ⚠️  statut obtenu: ${result.status} (attendu ${expected})`);
    }
  } catch (e) {
    console.log('  ❌ ERREUR');
    logErrorDetails(e, '     ');
  }
  console.log('');
}

function printSupportReport() {
  const maskedKey = apiKey ? apiKey.substring(0, 12) + '…[masqué]' : '(absent)';
  console.log('\n=== RAPPORT COMPLET — à copier pour le support CinetPay ===');
  console.log(`Date              : ${new Date().toISOString()}`);
  console.log(`SDK cinetpay-js   : v${SDK_VERSION}`);
  console.log(`Node.js           : ${process.version}`);
  console.log(`Environnement     : ${env}`);
  console.log(`Base URL          : ${baseUrl}`);
  console.log(`Pays              : ${country}`);
  console.log(`Clé API (masquée) : ${maskedKey}`);
  console.log('--- Logs internes du SDK (requêtes/réponses HTTP) ---');
  if (reportLines.length === 0) {
    console.log('(aucun log capturé)');
  } else {
    reportLines.forEach((l) => console.log(l));
  }
  console.log('=== FIN DU RAPPORT ===\n');
}

(async () => {
  const authOk = await testAuth();
  if (!authOk) {
    console.log('Arrêt : corrigez l\'authentification (voir credentials CinetPay) avant de tester les numéros.');
    printSupportReport();
    process.exitCode = 1;
    return;
  }

  for (const t of TEST_NUMBERS) {
    await testNumber(t);
  }

  printSupportReport();
})();
