const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');

let client = null;
let isReady = false;
let lastQr = null; // chaîne QR brute la plus récente, effacée une fois connecté

const attachListeners = (c) => {
  c.on('qr', (qr) => {
    lastQr = qr;
    isReady = false;
    console.log('\n══════════════════════════════════════════');
    console.log('  Scannez ce QR code avec WhatsApp VivriMarket');
    console.log('  (ou depuis Admin → Paramètres → WhatsApp)');
    console.log('══════════════════════════════════════════\n');
    qrcodeTerminal.generate(qr, { small: true });
  });

  c.on('ready', () => {
    isReady = true;
    lastQr = null;
    console.log('✅ WhatsApp VivriMarket connecté');
  });

  c.on('disconnected', (reason) => {
    isReady = false;
    console.warn('⚠️  WhatsApp déconnecté:', reason);
  });

  c.on('message', async (msg) => {
    // Traitement des réponses vendeurs (OUI)
    const { handleVendorReply } = require('../routes/contactRequests');
    await handleVendorReply(msg);
  });
};

const getClient = () => {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  attachListeners(client);

  client.initialize().catch((err) => {
    console.error('WhatsApp init error:', err.message);
  });

  return client;
};

// Détruit la session en cours (si bloquée/déconnectée) et en redémarre une neuve,
// ce qui déclenche un nouveau QR code si la session sauvegardée n'est plus valide.
// Nécessaire car le client ne se reconnecte jamais tout seul après un 'disconnected'.
const reconnect = async () => {
  if (client) {
    try { await client.destroy(); } catch (_) { /* déjà mort, on continue */ }
  }
  client = null;
  isReady = false;
  lastQr = null;
  getClient();
};

// Retourne le QR courant sous forme d'image (data URL PNG), prête à afficher
// dans l'admin — jamais transmis à un service tiers, généré localement.
const getQrImage = async () => {
  if (!lastQr) return null;
  return qrcode.toDataURL(lastQr, { width: 280, margin: 1 });
};

const sendWhatsApp = async (phone, message) => {
  // Normalise le numéro : +225XXXXXXXX → 225XXXXXXXX@c.us
  const normalized = phone.replace(/\D/g, '');
  const chatId = `${normalized}@c.us`;

  if (!isReady) {
    console.warn(`[WhatsApp] Client non prêt — message simulé vers ${phone}`);
    console.log(`[WhatsApp SIM] ${message}`);
    return { success: false, simulated: true };
  }

  try {
    await client.sendMessage(chatId, message);
    console.log(`[WhatsApp] ✓ Message envoyé à ${phone}`);
    return { success: true };
  } catch (err) {
    console.error(`[WhatsApp] Erreur envoi ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
};

const isWhatsAppReady = () => isReady;

module.exports = { getClient, sendWhatsApp, isWhatsAppReady, reconnect, getQrImage };
