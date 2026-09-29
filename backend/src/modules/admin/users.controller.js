// ============================================================
// MODULE: ADMIN
// CONTROLLER: users.controller
// Gestion des utilisateurs — ADMIN uniquement.
// ============================================================

const usersService = require('./users.service');

// #REGION handlers

const getAll = async (req, res) => {
  const users = await usersService.getAll();
  res.json(users);
};

const getById = async (req, res) => {
  const user = await usersService.getById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
};

const create = async (req, res) => {
  const { email, nom, prenom, role, password } = req.body;

  const VALID_ROLES = ['ADMIN', 'MAINTENANCE', 'PRODUCTION'];
  if (!email || !nom || !prenom || !role || !password)
    return res.status(400).json({ error: 'Tous les champs sont requis (email, nom, prenom, role, password)' });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}` });
  if (password.length < 8)
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });

  try {
    const user = await usersService.create({ email, nom, prenom, role, password }, req.user.sub);
    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const user = await usersService.update(req.params.id, req.body, req.user.sub);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const toggleActif = async (req, res) => {
  try {
    const user = await usersService.toggleActif(req.params.id, req.user.sub);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'Nouveau mot de passe requis (min. 8 caractères)' });
  try {
    await usersService.resetPassword(req.params.id, newPassword, req.user.sub);
    res.json({ message: 'Mot de passe réinitialisé. Sessions révoquées.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// #ENDREGION handlers

module.exports = { getAll, getById, create, update, toggleActif, resetPassword };
