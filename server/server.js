require('dotenv').config(); // 1. tout charger AVANT les autres require

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// Middlewares perso
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/auth');

// Routes
const authRoutes = require('./routes/auth');
const utilisateursRoutes = require('./routes/utilisateurs');
const productsRoutes = require('./routes/products');
const paiementRoutes = require('./routes/paiement');
const contactRoutes = require('./routes/contact');
const forfaitsRoutes = require('./routes/forfaits');
const adminRoutes = require('./routes/adminRoutes');
const cinetpayNotifyRoutes = require('./routes/cinetpayNotify');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const inscriptionGratuiteRoutes = require('./routes/inscriptionGratuite');

// Vérification Cloudinary
console.log('📡 Cloudinary config – Cloud :', process.env.CLD_CLOUD);

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== CONFIGURATION CORS ======================
// Configuration CORS dynamique pour plusieurs origines
const getCorsOrigins = () => {
  const origins = [];
  
  // Origines par défaut pour le développement
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  
  // Ajouter les origines depuis la variable d'environnement
  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    origins.push(...envOrigins);
  }
  
  // Ajouter vivrimarket.com (avec et sans www)
  origins.push('https://vivrimarket.com', 'https://www.vivrimarket.com');
  
  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (Postman, curl, serveur à serveur)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getCorsOrigins();
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️ Origine bloquée par CORS: ${origin}`);
      console.log(`Origines autorisées: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache les préflight requests pendant 24h
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pour les requêtes preflight

// ====================== SECURITE ======================
app.use(helmet({
  contentSecurityPolicy: false, // Désactiver si vous avez des problèmes avec les ressources externes
  crossOriginResourcePolicy: { policy: "cross-origin" } // Important pour les images Cloudinary
}));
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================== LOGGING ======================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
  console.log('🛠 Mode développement activé');
} else {
  app.use(morgan('combined'));
  console.log('🚀 Mode production');
}

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: { 
    success: false, 
    message: '🚫 Trop de requêtes depuis cette IP, réessayez dans 15 minutes.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter); // Appliquer le rate limiter à toutes les routes API

// ====================== MONGODB ======================
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connecté'))
  .catch((err) => {
    console.error('❌ Erreur de connexion MongoDB :', err.message);
    process.exit(1);
  });

// ====================== STATIQUES ======================
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    // Headers CORS pour les fichiers statiques
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// ====================== ROUTES ======================
// Publiques
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/utilisateurs', utilisateursRoutes);
app.use('/api', inscriptionGratuiteRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/paiement', paiementRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/forfaits', forfaitsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api', cinetpayNotifyRoutes);
app.use('/api/v1/chat', chatRoutes);

// Sécurisées
app.use('/api/v1/users', protect, userRoutes);

// Santé
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    corsOrigins: getCorsOrigins(),
    domain: 'vivrimarket.com'
  });
});

// Test CORS - utile pour déboguer
app.get('/api/v1/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS test réussi!',
    origin: req.headers.origin || 'Aucune origine',
    allowedOrigins: getCorsOrigins()
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Erreurs
app.use(errorHandler);

// ====================== SERVEUR ======================
const server = app.listen(PORT, () => {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'développement';
  console.log(`🚀 Serveur lancé sur le port ${PORT} (mode ${mode})`);
  console.log(`🌍 Origines CORS autorisées: ${getCorsOrigins().join(', ')}`);
  console.log(`📡 Cloudinary config – Cloud : ${process.env.CLD_CLOUD || 'Non configuré'}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  server.close(() => process.exit(1));
});