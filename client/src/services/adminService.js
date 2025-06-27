// src/services/adminService.js
import api from './axiosConfig';

// 🔹 Récupère la liste des utilisateurs
export const fetchUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    // En cas d'erreur, afficher le message axios si disponible
    const message = error.response?.data?.message || "Erreur lors de la récupération des utilisateurs";
    throw new Error(message);
  }
};

// 🔹 Met à jour le statut d’un utilisateur
export const updateUserStatus = async (userId, status) => {
  try {
    const response = await api.put(`/admin/users/${userId}/status`, { status });
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

// 🔹 Récupère la liste des transactions
export const fetchTransactions = async () => {
  try {
    const response = await api.get('/admin/transactions');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des transactions";
    throw new Error(message);
  }
};

// 🔹 Récupère la liste des abonnements
export const fetchSubscriptions = async () => {
  try {
    const response = await api.get('/admin/subscriptions');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des abonnements";
    throw new Error(message);
  }
};

// 🔹 Statistiques pour le tableau de bord admin
export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/admin/dashboard-stats');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Erreur lors de la récupération des statistiques du tableau de bord";
    throw new Error(message);
  }
};
