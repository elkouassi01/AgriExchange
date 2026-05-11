// src/services/adminService.js
import api from './axiosConfig';

// 🔹 Récupère la liste des utilisateurs (pagination serveur)
export const fetchUsers = async (params = {}) => {
  try {
    const { page = 1, limit = 15, role, search } = params;
    const query = new URLSearchParams({ page, limit });
    if (role) query.set('role', role);
    if (search) query.set('search', search);
    const response = await api.get(`/admin/users?${query}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des utilisateurs";
    throw new Error(message);
  }
};

// 🔹 Met à jour le statut d’un utilisateur
export const updateUserStatus = async (userId, estActif) => {
  try {
    const response = await api.put(`/admin/users/${userId}`, { estActif });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec de la mise à jour du statut";
    throw new Error(message);
  }
};

// 🔹 Supprime un utilisateur
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec de la suppression de l'utilisateur";
    throw new Error(message);
  }
};

// 🔹 Récupère la liste des transactions (pagination serveur)
export const fetchTransactions = async (params = {}) => {
  try {
    const { page = 1, limit = 20, status, search } = params;
    const query = new URLSearchParams({ page, limit });
    if (status && status !== 'all') query.set('status', status);
    if (search?.trim()) query.set('search', search.trim());
    const response = await api.get(`/admin/transactions?${query}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des transactions";
    throw new Error(message);
  }
};

// 🔹 Statistiques globales des transactions
export const fetchTransactionStats = async () => {
  try {
    const response = await api.get('/admin/transactions/stats');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur stats transactions";
    throw new Error(message);
  }
};

// 🔹 Récupère la liste des abonnements (pagination serveur)
export const fetchSubscriptions = async (params = {}) => {
  try {
    const { page = 1, limit = 20, status, formule, search } = params;
    const query = new URLSearchParams({ page, limit });
    if (status && status !== 'all') query.set('status', status);
    if (formule && formule !== 'all') query.set('formule', formule);
    if (search?.trim()) query.set('search', search.trim());
    const response = await api.get(`/admin/abonnements?${query}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des abonnements";
    throw new Error(message);
  }
};

// 🔹 Crée un nouvel utilisateur
export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec de la création de l'utilisateur";
    throw new Error(message);
  }
};

// 🔹 Change le rôle d'un utilisateur
export const changeUserRole = async (userId, role) => {
  try {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec du changement de rôle";
    throw new Error(message);
  }
};

// 🔹 Suspend ou réactive un utilisateur
export const suspendUser = async (userId, suspended) => {
  try {
    const response = await api.put(`/admin/users/${userId}/suspend`, { suspended });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec de la suspension";
    throw new Error(message);
  }
};

// 🔹 Récupère les logs d'audit admin
export const fetchAuditLogs = async (params = {}) => {
  try {
    const { page = 1, limit = 20, action, adminId } = params;
    const query = new URLSearchParams({ page, limit });
    if (action)  query.set('action', action);
    if (adminId) query.set('adminId', adminId);
    const response = await api.get(`/admin/audit-logs?${query}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des logs";
    throw new Error(message);
  }
};

// 🔹 Statistiques pour le tableau de bord admin
export const fetchDashboardStats = async (forceRefresh = false) => {
  try {
    const url = forceRefresh ? '/admin/dashboard?refresh=1' : '/admin/dashboard';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des statistiques du tableau de bord";
    throw new Error(message);
  }
};

// 🔹 Statut système (MySQL, WhatsApp, Email, serveur)
export const fetchSystemStatus = async () => {
  try {
    const response = await api.get('/admin/system-status');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur récupération statut système";
    throw new Error(message);
  }
};

// 🔹 Envoyer un email de test à l'admin connecté
export const sendTestNotification = async () => {
  try {
    const response = await api.post('/admin/test-notification');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Échec de l'envoi de test";
    throw new Error(message);
  }
};
