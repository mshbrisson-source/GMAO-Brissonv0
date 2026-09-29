// ============================================================
// MODULE: AUTH — Configuration environnement
// Centralise toutes les variables d'env avec valeurs par défaut
// ============================================================

module.exports = {
  NODE_ENV:               process.env.NODE_ENV || 'development',
  PORT:                   parseInt(process.env.PORT) || 3000,

  // Base de données
  DATABASE_URL:           process.env.DATABASE_URL,

  // JWT access token — courte durée (15 min)
  JWT_SECRET:             process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET manquant') })(),
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN || '15m',

  // Code de confirmation admin pour données fondatrices
  ADMIN_CONFIRM_CODE:     process.env.ADMIN_CONFIRM_CODE || (() => { throw new Error('ADMIN_CONFIRM_CODE manquant') })(),

  // Bcrypt
  SALT_ROUNDS:            parseInt(process.env.SALT_ROUNDS) || 12,

  // Fichiers uploadés
  UPLOADS_DIR:            process.env.UPLOADS_DIR || './uploads',
  MAX_FILE_SIZE_MB:       parseInt(process.env.MAX_FILE_SIZE_MB) || 20,
};
