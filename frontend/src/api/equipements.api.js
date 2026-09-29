// ============================================================
// MODULE: EQUIPEMENTS
// SERVICE: equipements.api.js
// Toutes les requêtes vers /api/equipements
// ============================================================

import { api, apiWithConfirmCode } from './api';

// #REGION lecture

export const getTree     = ()         => api.get('/equipements/tree').then(r => r.data);
export const getMachines = (params)   => api.get('/equipements/machines', { params }).then(r => r.data);
export const getAteliers = ()         => api.get('/equipements/ateliers').then(r => r.data);
export const getAtelier  = (id)       => api.get(`/equipements/ateliers/${id}`).then(r => r.data);
export const getMachine  = (id)       => api.get(`/equipements/machines/${id}`).then(r => r.data);

export const getMachineInterventions = (id, page = 1) =>
  api.get(`/equipements/machines/${id}/interventions`, { params: { page } }).then(r => r.data);

export const getAtelierHistorique = (id, params) =>
  api.get(`/equipements/ateliers/${id}/historique`, { params }).then(r => r.data);

// #ENDREGION lecture

// #REGION ecriture (nécessite code de confirmation admin)

export const createAtelier  = (data, code) => apiWithConfirmCode(code).post('/equipements/ateliers', data);
export const updateAtelier  = (id, data, code) => apiWithConfirmCode(code).patch(`/equipements/ateliers/${id}`, data);
export const archiveAtelier = (id, code) => apiWithConfirmCode(code).delete(`/equipements/ateliers/${id}`);
export const restoreAtelier = (id, code) => apiWithConfirmCode(code).patch(`/equipements/ateliers/${id}/restore`);

export const createMachine  = (data, code) => apiWithConfirmCode(code).post('/equipements/machines', data);
export const updateMachine  = (id, data, code) => apiWithConfirmCode(code).patch(`/equipements/machines/${id}`, data);
export const archiveMachine = (id, code) => apiWithConfirmCode(code).delete(`/equipements/machines/${id}`);
export const restoreMachine = (id, code) => apiWithConfirmCode(code).patch(`/equipements/machines/${id}/restore`);

export const uploadMachinePhoto = (id, file, code) => {
  const form = new FormData();
  form.append('photo', file);
  return apiWithConfirmCode(code).post(`/equipements/machines/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// #ENDREGION ecriture

// #REGION elements

export const addElement    = (machineId, data) => api.post(`/equipements/machines/${machineId}/elements`, data);
export const updateElement = (id, data)        => api.patch(`/equipements/elements/${id}`, data);
export const deleteElement = (id, code)        => apiWithConfirmCode(code).delete(`/equipements/elements/${id}`);

// #ENDREGION elements
