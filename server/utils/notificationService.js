// Utils: Notification Service
// Centralise tous les canaux de notification: WhatsApp, Email, Messages in-app

const { sendWhatsApp, isWhatsAppReady } = require('./whatsappClient');
const emailService = require('./emailService');
const mysqlMessageRepository = require('../repositories/mysqlMessageRepository');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');

// Initialiser le service email au chargement du module
emailService.initializeEmail();

/**
 * Types de notifications
 */
const NOTIFICATION_TYPES = {
  OTP: 'otp',
  ACCOUNT_CREATED: 'account_created',
  PASSWORD_RESET: 'password_reset',
  SPONSOR_ACTIVATED: 'sponsor_activated',
  SYSTEM_ALERT: 'system_alert',
};

/**
 * Format numéro de téléphone pour WhatsApp
 */
const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  // Nettoyer: garder uniquement les chiffres
  let cleaned = phone.replace(/\D/g, '');
  // Ajouter l'indicatif pays si nécessaire (pour le Bénin: 229)
  if (cleaned.length === 8 && !cleaned.startsWith('229')) {
    cleaned = '229' + cleaned;
  }
  return cleaned + '@c.us';
};

/**
 * Récupérer l'email de l'utilisateur
 */
const getUserEmail = async (userId) => {
  try {
    const user = await mysqlUserRepository.findUserById(userId);
    return user?.email;
  } catch (error) {
    console.error('[Notification] Erreur récupération email:', error.message);
    return null;
  }
};

/**
 * Récupérer le nom de l'utilisateur
 */
const getUserName = async (userId) => {
  try {
    const user = await mysqlUserRepository.findUserById(userId);
    return user?.nom || 'Utilisateur';
  } catch (error) {
    return 'Utilisateur';
  }
};

/**
 * Sauvegarder un message système dans la table messages
 * Note: Les OTP sont des messages système (sender = null ou système)
 */
const saveSystemMessage = async (userId, message, metadata = {}) => {
  if (!userId) {
    console.log('[Notification] Pas de userId, message système non sauvegardé');
    return null;
  }
  try {
    // Préfixer le message avec le type pour pouvoir filtrer plus tard
    const prefix = metadata.type ? `[${metadata.type.toUpperCase()}] ` : '';
    const fullMessage = prefix + message;

    const messageData = {
      sender_id: null, // Message système
      receiver_id: userId,
      product_id: null, // Pas lié à un produit
      contenu: fullMessage,
    };

    const saved = await mysqlMessageRepository.sendMessage(messageData);
    console.log(`[Notification] Message système sauvé: ${saved.id}`);
    return saved;
  } catch (error) {
    console.error('[Notification] Erreur sauvegarde message:', error.message);
    return null;
  }
};

/**
 * Envoyer une notification en spécifiant seulement le téléphone
 * (lookup utilisateur automatique)
 */
const sendByPhone = async (phone, subject, message, options = {}) => {
  // Chercher l'utilisateur par contact
  const user = await mysqlUserRepository.findUserByContact(phone);
  if (!user) {
    console.warn(`[Notification] Utilisateur non trouvé pour phone: ${phone}`);
    // On peut quand même envoyer WhatsApp sans email/in-app
    const results = { whatsapp: { success: false }, email: { success: false }, inApp: { success: false } };
    if (phone && options.channels?.includes('whatsapp')) {
      try {
        const whatsappNumber = formatPhoneForWhatsApp(phone);
        if (whatsappNumber && (await isWhatsAppReady())) {
          await sendWhatsApp(whatsappNumber, `*${subject}*\n\n${message}`);
          results.whatsapp.success = true;
        }
      } catch (e) {
        results.whatsapp.error = e.message;
      }
    }
    return results;
  }

  // Utilisateur trouvé, on envoie avec userId
  return sendNotification(user.id, { phone: user.contact, email: user.email }, subject, message, options);
};

/**
 * Envoyer une notification OTP via tous les canaux
 * @param {String} userId - ID de l'utilisateur (peut être null pour guests)
 * @param {String} phone - Numéro de téléphone
 * @param {String} email - Adresse email (optionnelle)
 * @param {String} otp - Code OTP
 * @param {Object} options - { expiryMinutes, userName }
 */
const sendOTPNotification = async (userId, phone, email, otp, options = {}) => {
  const { expiryMinutes = 10, userName = 'Utilisateur' } = options;
  const results = {
    whatsapp: { success: false, error: null },
    email: { success: false, error: null },
    inApp: { success: false, error: null },
  };

  // 1. Envoyer par WhatsApp
  if (phone) {
    try {
      const whatsappNumber = formatPhoneForWhatsApp(phone);
      if (whatsappNumber && (await isWhatsAppReady())) {
        const message = `🔐 *AgriExchange*\n\nBonjour ${userName},\nVotre code de vérification est : *${otp}*\n\n⚠️ Ne partagez jamais ce code.\nValide pendant ${expiryMinutes} minutes.`;
        await sendWhatsApp(whatsappNumber, message);
        results.whatsapp.success = true;
        console.log(`[Notification] OTP WhatsApp envoyé à ${phone}`);
      } else {
        results.whatsapp.error = 'WhatsApp non prêt ou numéro manquant';
      }
    } catch (error) {
      results.whatsapp.error = error.message;
      console.error('[Notification] Erreur WhatsApp:', error.message);
    }
  }

  // 2. Envoyer par Email
  if (email) {
    try {
      await emailService.sendOTP(email, userName, otp, expiryMinutes);
      results.email.success = true;
      console.log(`[Notification] OTP email envoyé à ${email}`);
    } catch (error) {
      results.email.error = error.message;
      console.error('[Notification] Erreur email:', error.message);
    }
  }

  // 3. Sauvegarder dans la messagerie in-app (system message)
  if (userId) {
    try {
      const messageText = `🔐 Votre code de vérification : ${otp}\n\nCe code est valide pendant ${expiryMinutes} minutes.`;
      await saveSystemMessage(userId, messageText, {
        type: NOTIFICATION_TYPES.OTP,
        otp: otp,
        sent_via: ['whatsapp', 'email'].filter(k => results[k].success).join(', '),
      });
      results.inApp.success = true;
      console.log(`[Notification] OTP sauvé en base pour user ${userId}`);
    } catch (error) {
      results.inApp.error = error.message;
      console.error('[Notification] Erreur sauvegarde message:', error.message);
    }
  } else {
    console.log('[Notification] Pas d\'userId, message OTP non sauvegardé en base');
  }

  return results;
};

/**
 * Envoyer une notification générique (multi-canal)
 */
const sendNotification = async (userId, { phone, email }, subject, message, options = {}) => {
  const results = {
    whatsapp: { success: false, error: null },
    email: { success: false, error: null },
    inApp: { success: false, error: null },
  };

  // WhatsApp
  if (phone && options.channels?.includes('whatsapp')) {
    try {
      const whatsappNumber = formatPhoneForWhatsApp(phone);
      if (whatsappNumber && (await isWhatsAppReady())) {
        await sendWhatsApp(whatsappNumber, `*${subject}*\n\n${message}`);
        results.whatsapp.success = true;
      }
    } catch (error) {
      results.whatsapp.error = error.message;
    }
  }

  // Email
  if (email && options.channels?.includes('email')) {
    try {
      await emailService.sendGeneric(email, subject, `<p>${message.replace(/\n/g, '<br>')}</p>`, message);
      results.email.success = true;
    } catch (error) {
      results.email.error = error.message;
    }
  }

  // In-app message
  if (options.channels?.includes('inapp')) {
    try {
      await saveSystemMessage(userId, `*${subject}*\n\n${message}`, {
        type: options.type || NOTIFICATION_TYPES.SYSTEM_ALERT,
      });
      results.inApp.success = true;
    } catch (error) {
      results.inApp.error = error.message;
    }
  }

  return results;
};

/**
 * Envoyer notification de sponsorship activé (multi-canal)
 */
const sendSponsorActivated = async (userId, phone, email, productName, sponsorDays) => {
  const subject = '✅ Sponsoring activé';
  const message = `Félicitations !\n\nVotre produit "${productName}" est maintenant sponsorisé pour ${sponsorDays} jours.\n\nVotre produit sera mis en avant sur la plateforme et visible par plus d'acheteurs.`;

  return sendNotification(userId, { phone, email }, subject, message, {
    channels: ['whatsapp', 'email', 'inapp'],
    type: NOTIFICATION_TYPES.SPONSOR_ACTIVATED,
  });
};

module.exports = {
  NOTIFICATION_TYPES,
  sendOTPNotification,
  sendNotification,
  sendSponsorActivated,
  sendByPhone,
  initialize: () => {
    emailService.initializeEmail();
    console.log('[NotificationService] Service initialisé');
  },
};
  initialize: () => {
    emailService.initializeEmail();
  },
};
