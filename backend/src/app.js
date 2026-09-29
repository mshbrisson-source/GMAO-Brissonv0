// ============================================================
// app.js — Point d'entrée Express
// Montage des middlewares globaux et des routes.
// ============================================================

const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

// Routes
const authRoutes        = require('./modules/auth/auth.routes');
const usersRoutes       = require('./modules/admin/users.routes');
const dashboardRoutes   = require('./modules/dashboard/dashboard.routes');
const equipementsRoutes = require('./modules/equipements/equipements.routes');
const stockRoutes       = require('./modules/stock/stock.routes');
const documentsRoutes   = require('./modules/documents/documents.routes');
// EXTENSION POINT: require('./modules/interventions/interventions.routes') — étape 4
// EXTENSION POINT: require('./modules/preventif/preventif.routes')          — étape 8
// EXTENSION POINT: require('./modules/analytics/analytics.routes')          — étape 12

const app = express();

// Trust reverse proxy headers from nginx/docker
app.set('trust proxy', 1);

// #REGION middlewares-securite

app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // nécessaire pour les cookies cross-origin
}));

// Limite les tentatives de login (protection brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,
  message:  { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// #ENDREGION middlewares-securite

// #REGION middlewares-parse

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// #ENDREGION middlewares-parse

// #REGION routes

app.use('/api/auth',          loginLimiter, authRoutes);
app.use('/api/admin/users',  usersRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/equipements',  equipementsRoutes);
app.use('/api/stock',        stockRoutes);
app.use('/api/documents',    documentsRoutes);

// Sanity check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// #ENDREGION routes

// #REGION error-handler

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  });
});

// #ENDREGION error-handler

module.exports = app;
