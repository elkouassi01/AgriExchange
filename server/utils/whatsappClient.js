const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let isReady = false;

const getClient = () => {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n══════════════════════════════════════════');
    console.log('  Scannez ce QR code avec WhatsApp VivriMarket');
    console.log('══════════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp VivriMarket connecté');
  });

  client.on('disconnected', () => {
    isReady = false;
    console.warn('⚠️  WhatsApp déconnecté');
  });

  client.on('message', async (msg) => {
    // Traitement des réponses vendeurs (OUI)
    const { handleVendorReply } = require('../routes/contactRequests');
    await handleVendorReply(msg);
  });

  client.initialize().catch((err) => {
    console.error('WhatsApp init error:', err.message);
  });

  return client;
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

module.exports = { getClient, sendWhatsApp, isWhatsAppReady };
