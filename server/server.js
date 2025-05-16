const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
// const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Sécurité : en-têtes, anti-injection, cookies
app.use(helmet());
app.use(hpp());
// app.use(xss());
// app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 2. CORS global (React en dev)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 3. Logging en mode développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  console.log('🛠 Mode développement activé');
}

// 4. Protection contre le spam d'API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: '🚫 Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use('/api', limiter);

// 5. Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  });

// 6. Exposition du dossier /uploads avec en-têtes CORS
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// 7. Routes principales
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/auth', authRoutes);

// 8. Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 9. 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// 10. Gestion d'erreurs
app.use(errorHandler);

// 11. Démarrage
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

// 12. Arrêt propre
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => process.exit(0));
});
