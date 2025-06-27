const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// 🛡️ Middlewares personnalisés
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/auth');

// 📦 Routes API
const authRoutes = require('./routes/auth');
const utilisateursRoutes = require('./routes/utilisateurs');
const productsRoutes = require('./routes/products');
const paiementRoutes = require('./routes/paiement');
const contactRoutes = require('./routes/contact');
const forfaitsRoutes = require('./routes/forfaits');
const adminRoutes = require('./routes/adminRoutes');
const cinetpayNotifyRoutes = require('./routes/cinetpayNotify');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes'); // 🔒 Sécurisé

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ======================
// 🔐 MIDDLEWARES DE SÉCURITÉ
// ======================
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(helmet());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));           // ✅ JSON Parser pour Postman/Front
app.use(express.urlencoded({ extended: true }));    // ✅ Pour les formulaires HTML encodés

// ======================
// 🛠️ LOGGING & RATE LIMIT
// ======================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
  console.log('🛠 Mode développement activé');
}

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: '🚫 Trop de requêtes, réessayez plus tard.'
}));

// ======================
// 🌱 CONNEXION MONGODB
// ======================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB Atlas connecté'))
.catch((err) => {
  console.error('❌ Erreur de connexion MongoDB :', err.message);
  process.exit(1);
});

// ======================
// 📂 FICHIERS STATIQUES (IMAGES)
// ======================
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// ======================
// 📡 ROUTES API
// ======================
// 🔓 Publiques
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/utilisateurs', utilisateursRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/paiement', paiementRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/forfaits', forfaitsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api', cinetpayNotifyRoutes);

// 🔐 Privées (auth obligatoire)
app.use('/api/v1/users', protect, userRoutes);

// ✅ Vérification API
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ❌ Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// 🛠 Gestion centralisée des erreurs
app.use(errorHandler);

// ======================
// 🚀 LANCEMENT DU SERVEUR
// ======================
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

// 🛑 Fermeture propre (ex: Heroku)
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => process.exit(0));
});
