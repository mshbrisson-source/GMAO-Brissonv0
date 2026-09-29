// ============================================================
// MODULE: STOCK
// SERVICE: stock.api.js
// Toutes les requêtes vers /api/stock
// ============================================================

import { api, apiWithConfirmCode } from './api';

// #REGION fournisseurs

export const getFournisseurs    = ()       => api.get('/stock/fournisseurs').then(r => r.data);
export const getFournisseurById = (id)     => api.get(`/stock/fournisseurs/${id}`).then(r => r.data);
export const createFournisseur  = (d, c)   => apiWithConfirmCode(c).post('/stock/fournisseurs', d);
export const updateFournisseur  = (id,d,c) => apiWithConfirmCode(c).patch(`/stock/fournisseurs/${id}`, d);
export const deleteFournisseur  = (id, c)  => apiWithConfirmCode(c).delete(`/stock/fournisseurs/${id}`);

// #ENDREGION fournisseurs

// #REGION pieces

export const getPieces       = (params) => api.get('/stock/pieces', { params }).then(r => r.data);
export const getPiecesAlerte = ()        => api.get('/stock/pieces/alertes').then(r => r.data);
export const getPieceById    = (id)      => api.get(`/stock/pieces/${id}`).then(r => r.data);
export const createPiece     = (d, c)    => apiWithConfirmCode(c).post('/stock/pieces', d);
export const updatePiece     = (id,d,c)  => apiWithConfirmCode(c).patch(`/stock/pieces/${id}`, d);
export const linkMachine     = (pieceId, machineId, notes) =>
  api.post(`/stock/pieces/${pieceId}/machines`, { machineId, notes });
export const unlinkMachine   = (pieceId, machineId, c) =>
  apiWithConfirmCode(c).delete(`/stock/pieces/${pieceId}/machines/${machineId}`);

// #ENDREGION pieces

// #REGION mouvements

export const getMouvements = (params) => api.get('/stock/mouvements', { params }).then(r => r.data);
export const entreeStock   = (data)   => api.post('/stock/mouvements/entree', data);
export const sortieStock   = (data)   => api.post('/stock/mouvements/sortie', data);

// #ENDREGION mouvements

// #REGION bon-commande

export const previewBonCommande = (lignes, fournisseurId) =>
  api.post('/stock/bon-commande/preview', { lignes, fournisseurId }).then(r => r.data);

export const downloadBonCommande = async (lignes, fournisseurId, numero) => {
  const res = await api.post(
    '/stock/bon-commande/pdf',
    { lignes, fournisseurId, numero },
    { responseType: 'blob' }
  );
  // Déclenche le téléchargement dans le navigateur
  const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href     = url;
  link.download = `bon-commande-${Date.now()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// #ENDREGION bon-commande
