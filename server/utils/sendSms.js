// utils/sendSms.js
// 🔹 Simulation d'envoi de SMS pour éviter les erreurs Twilio pendant le dev local

const sendSms = async (numero, message) => {
  console.log(`📩 [SMS SIMULÉ] Envoi à ${numero} : ${message}`);
  return { success: true };
};

module.exports = sendSms;
