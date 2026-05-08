require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Validation des variables critiques au demarrage
const REQUIRED_ENV = ['JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[ENV] Variables manquantes:', missing.join(', '));
  console.error('[ENV] Copiez server/.env.example en server/.env et remplissez les valeurs.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'CHANGE_ME_STRONG_RANDOM_SECRET') {
  console.error('[ENV] JWT_SECRET utilise la valeur par defaut — changez-la en production!');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { testMysqlConnection } = require('./config/mysql');

const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/auth');

const authRoutes = require('./routes/auth');
const utilisateursRoutes = require('./routes/utilisateurs');
const productsRoutes = require('./routes/products');
const contactRoutes = require('./routes/contact');
const forfaitsRoutes = require('./routes/forfaits');
const adminRoutes = require('./routes/adminRoutes');
const cinetpayNotifyRoutes = require('./routes/cinetpayNotify');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const inscriptionGratuiteRoutes = require('./routes/inscriptionGratuite');
const productPaymentsRoutes = require('./routes/productPayments');
const contactRequestsRoutes = require('./routes/contactRequests');
const { startContactRequestCron } = require('./routes/contactRequests');
const { getClient: initWhatsApp } = require('./utils/whatsappClient');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DATABASE_PROVIDER = (process.env.DATABASE_PROVIDER || 'mysql').toLowerCase();

const getCorsOrigins = () => {
  const origins = [];

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }

  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
    origins.push(...envOrigins.filter((origin) => !origins.includes(origin)));
  }

  origins.push('https://vivrimarket.com', 'https://www.vivrimarket.com');

  return [...new Set(origins)];
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getCorsOrigins();
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`Blocked by CORS: ${origin}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
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
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
  console.log('Development mode enabled');
} else {
  app.use(morgan('combined'));
  console.log('Production mode enabled');
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please retry in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const explainMongoError = (message) => {
  if (message.includes('querySrv')) {
    return 'DNS lookup failed for MongoDB Atlas. Try again, change DNS to 8.8.8.8 or 1.1.1.1, and verify Atlas network access.';
  }

  if (message.includes('Authentication failed')) {
    return 'MongoDB credentials look invalid. Recheck the username, password, and database user permissions in Atlas.';
  }

  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return 'Network access to MongoDB Atlas failed. Check your internet connection and Atlas IP allowlist.';
  }

  return null;
};

const connectToMongo = async () => {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI or MONGODB_URI in .env');
  }

  const maxAttempts = process.env.NODE_ENV === 'production' ? 3 : 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('MongoDB Atlas connected');
      return;
    } catch (err) {
      const hint = explainMongoError(err.message);
      console.error(`MongoDB connection error (${attempt}/${maxAttempts}): ${err.message}`);
      if (hint) {
        console.error(`Hint: ${hint}`);
      }

      // En mode développement, si la connexion échoue, on logue un avertissement mais continue
      // pour permettre de tester l'architecture PostgreSQL qui est la cible de la migration
      if (attempt === maxAttempts) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ MongoDB non disponible - Démarrage en mode dégradé (PostgreSQL ready)');
          // On ne throw pas pour permettre au serveur de démarrer
          return;
        } else {
          throw err;
        }
      }

      await wait(3000);
    }
  }
};

const connectToMysql = async () => {
  await testMysqlConnection();
  console.log('MySQL connected');
  const { ensureTables } = require('./repositories/mysqlContactRequestRepository');
  await ensureTables();
  const { ensureIndexes, ensureColumns } = require('./utils/dbMigrations');
  await ensureColumns();
  await ensureIndexes();
};

const connectToDatabase = async () => {
  if (DATABASE_PROVIDER === 'mysql') {
    try {
      await connectToMysql();
    } catch (err) {
      console.warn(`⚠️ MySQL indisponible: ${err.message}`);
    }
    return;
  }

  if (DATABASE_PROVIDER === 'mongo') {
    try {
      await connectToMongo();
    } catch (err) {
      console.warn(`⚠️ MongoDB indisponible: ${err.message}`);
    }
    return;
  }

  console.warn(`⚠️ DATABASE_PROVIDER inconnu: ${DATABASE_PROVIDER}`);
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/utilisateurs', utilisateursRoutes);
app.use('/api/v1/inscription-gratuite', inscriptionGratuiteRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/forfaits', forfaitsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/cinetpay-notify', cinetpayNotifyRoutes);
app.use('/api/v1/chat', chatRoutes);

app.use('/api/v1/users', protect, userRoutes);
app.use('/api/v1/product-payments', productPaymentsRoutes);
app.use('/api/v1/contact-requests', contactRequestsRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
      status: 'OK',
      databaseProvider: DATABASE_PROVIDER,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    corsOrigins: getCorsOrigins(),
    domain: 'vivrimarket.com',
  });
});

app.get('/api/v1/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS test succeeded',
    origin: req.headers.origin || 'No origin',
    allowedOrigins: getCorsOrigins(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

app.use(errorHandler);

let server;

const startServer = async () => {
  try {
    await connectToDatabase();

    server = app.listen(PORT, () => {
      const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
      console.log(`Server listening on port ${PORT} (${mode})`);
      console.log(`Database provider: ${DATABASE_PROVIDER}`);
      console.log(`Allowed CORS origins: ${getCorsOrigins().join(', ')}`);
      console.log(`Cloudinary cloud: ${process.env.CLD_CLOUD || 'not configured'}`);

      // WhatsApp + cron (ne bloque pas le démarrage)
      if (process.env.WHATSAPP_ENABLED !== 'false') {
        initWhatsApp();
        startContactRequestCron();
      }
    });
  } catch (err) {
    console.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('Stopping server...');
  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    console.log('Server stopped cleanly');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  if (!server) {
    process.exit(1);
  }

  server.close(() => process.exit(1));
});
