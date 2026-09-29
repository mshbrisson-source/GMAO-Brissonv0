// ============================================================
// MODULE: AUTH
// CONTROLLER: auth.controller
// Reçoit les requêtes HTTP, valide les entrées, délègue au service.
// Gère les cookies httpOnly pour le refresh token.
// ============================================================

const authService = require('./auth.service');

// Options du cookie refresh token
const cookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours en ms
  path:     '/api/auth',              // scope limité
});

// #REGION handlers

/**
 * POST /api/auth/login
 * Corps : { email, password }
 * Réponse : { accessToken, user }  +  cookie refreshToken (httpOnly)
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const result = await authService.login(
      email.toLowerCase().trim(),
      password,
      req.ip
    );

    res.cookie('refreshToken', result.refreshToken, cookieOptions());
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    // Délai artificiel pour ralentir le bruteforce
    await new Promise((r) => setTimeout(r, 400));
    res.status(401).json({ error: err.message });
  }
};

/**
 * POST /api/auth/refresh
 * Cookie : refreshToken
 * Réponse : { accessToken }  +  nouveau cookie refreshToken
 */
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'Session absente. Veuillez vous reconnecter.' });
  }

  try {
    const result = await authService.refresh(token);
    res.cookie('refreshToken', result.refreshToken, cookieOptions());
    res.json({ accessToken: result.accessToken });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(401).json({ error: err.message });
  }
};

/**
 * POST /api/auth/logout
 * Nécessite d'être authentifié (authenticate middleware).
 */
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  await authService.logout(token, req.user?.sub);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Déconnecté avec succès' });
};

/**
 * GET /api/auth/me
 * Retourne le profil issu du token JWT déjà vérifié.
 */
const me = (req, res) => {
  res.json(req.user);
};

// #ENDREGION handlers

module.exports = { login, refresh, logout, me };
