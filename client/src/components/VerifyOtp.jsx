import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import { useUser } from "../contexts/UserContext";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUser();

  const telephone =
    location.state?.telephone || localStorage.getItem("pendingPhone") || "";

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const getRoleRedirect = (role) => {
    switch (role) {
      case "admin": return "/admin/dashboard";
      case "agriculteur": return "/profil-agriculteur";
      case "consommateur": return "/profil-consommateur";
      default: return "/";
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) return setMessage("Veuillez entrer le code OTP reçu par WhatsApp.");

    setLoading(true);
    try {
      const res = await axios.post(
        buildApiUrl('/auth/verify-otp'),
        { telephone, otp }
      );

      setMessage(res.data.message || "Compte vérifié avec succès !");
      localStorage.removeItem("pendingPhone");

      if (res.data?.token && res.data?.utilisateur) {
        login(res.data.utilisateur, res.data.token);
        setTimeout(() => navigate(getRoleRedirect(res.data.utilisateur.role), { replace: true }), 1500);
      } else {
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Code OTP incorrect ou expiré."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Renvoyer un nouveau code OTP
  const handleResend = async () => {
    setResending(true);
    try {
      const res = await axios.post(
        buildApiUrl('/auth/resend-otp'),
        { telephone }
      );
      setMessage(res.data.message || "Nouveau code envoyé !");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Erreur lors du renvoi du code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-green-50">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4 text-green-700">
          Vérification du code OTP
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Entrez le code reçu par <strong>WhatsApp</strong> sur <strong>{telephone}</strong>
        </p>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Code OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="border rounded-lg p-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
            maxLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className={`${
              loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
            } text-white font-semibold py-2 rounded-lg transition`}
          >
            {loading ? "Vérification..." : "Valider le code"}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-4 text-sm text-blue-600 hover:underline w-full"
        >
          {resending ? "Renvoi en cours..." : "Renvoyer le code"}
        </button>

        {message && (
          <p className="text-center mt-4 text-gray-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default VerifyOtp;
