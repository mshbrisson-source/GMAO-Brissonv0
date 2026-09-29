// ============================================================
// MODULE: DOCUMENTS
// SERVICE: documents.api.js
// ============================================================

import { api } from './api';

// #REGION lecture

export const getDocuments     = (params)    => api.get('/documents', { params }).then(r => r.data);
export const getDocumentById  = (id)        => api.get(`/documents/${id}`).then(r => r.data);
export const getVersionHistory = (groupId)  => api.get(`/documents/groupe/${groupId}/versions`).then(r => r.data);

// #ENDREGION lecture

// #REGION streaming

/**
 * Retourne une URL signée blob pour l'affichage inline.
 * Nécessite le JWT dans l'en-tête (géré par l'intercepteur axios).
 */
export const getViewUrl = async (id) => {
  const res = await api.get(`/documents/${id}/view`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

export const getDownloadUrl = async (id, titre) => {
  const res  = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url  = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href     = url;
  link.download = titre || 'document';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// #ENDREGION streaming

// #REGION écriture

export const createDocument = (formData) =>
  api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const createNewVersion = (groupId, formData) =>
  api.post(`/documents/groupe/${groupId}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const restoreVersion = (id) =>
  api.patch(`/documents/versions/${id}/restaurer`);

export const deleteDocument = (groupId) =>
  api.delete(`/documents/groupe/${groupId}`);

// #ENDREGION écriture
