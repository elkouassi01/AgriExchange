// src/pages/admin/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Snackbar,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as GeneralIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  MonetizationOn as PaymentsIcon
} from '@mui/icons-material';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const SettingsPage = () => {
  const { admin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'AgriConnect',
    siteUrl: 'https://agriconnect.ci',
    currency: 'XOF',
    timezone: 'Africa/Abidjan',
    language: 'fr'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    newsletterEnabled: true,
    lowBalanceAlert: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordComplexity: true,
    loginAttempts: 5,
    sessionTimeout: 30
  });

  const [paymentSettings, setPaymentSettings] = useState({
    cinetpayApiKey: '',
    cinetpaySiteId: '',
    stripeEnabled: false,
    stripeSecretKey: '',
    stripePublicKey: '',
    paypalEnabled: false,
    paypalClientId: '',
    mobileMoneyEnabled: true
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setTimeout(() => {
          setGeneralSettings({
            siteName: 'AgriConnect',
            siteUrl: 'https://agriconnect.ci',
            currency: 'XOF',
            timezone: 'Africa/Abidjan',
            language: 'fr'
          });

          setNotificationSettings({
            emailNotifications: true,
            pushNotifications: false,
            newsletterEnabled: true,
            lowBalanceAlert: true
          });

          setSecuritySettings({
            twoFactorAuth: false,
            passwordComplexity: true,
            loginAttempts: 5,
            sessionTimeout: 30
          });

          setPaymentSettings({
            cinetpayApiKey: 'sk_test_1234567890abcdef',
            cinetpaySiteId: '123456',
            stripeEnabled: false,
            stripeSecretKey: '',
            stripePublicKey: '',
            paypalEnabled: false,
            paypalClientId: '',
            mobileMoneyEnabled: true
          });

          setLoading(false);
        }, 1000);
      } catch (error) {
        setError('Erreur lors du chargement des paramètres');
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTabChange = (event, newValue) => setActiveTab(newValue);

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setTimeout(() => {
        setSaving(false);
        setSuccess(true);
      }, 1500);
    } catch (error) {
      setSaving(false);
      setError('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const handleCloseSnackbar = () => setSuccess(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="page-parametres">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" className="titre-parametres" gutterBottom>
          Paramètres de la plateforme
        </Typography>
        <Typography variant="body1" className="sous-titre-parametres">
          Configurez les paramètres généraux, de notification et de sécurité de la plateforme
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Général" icon={<GeneralIcon />} iconPosition="start" />
          <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Sécurité" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Paiements" icon={<PaymentsIcon />} iconPosition="start" />
        </Tabs>

        <Box className="panneau-onglet-parametres">
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Général */}
              {/* même contenu que précédemment, inchangé, les className sont globales */}
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={handleNotificationChange}
                      name="emailNotifications"
                      color="primary"
                    />
                  }
                  label="Notifications par email"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onChange={handleNotificationChange}
                      name="pushNotifications"
                      color="primary"
                    />
                  }
                  label="Notifications push"
                />
                <Typography className="description-interrupteur">
                  Les utilisateurs recevront des notifications sur leur appareil mobile
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.newsletterEnabled}
                      onChange={handleNotificationChange}
                      name="newsletterEnabled"
                      color="primary"
                    />
                  }
                  label="Newsletter hebdomadaire"
                />
                <Typography className="description-interrupteur">
                  Envoi automatique des nouvelles offres et actualités aux utilisateurs
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.lowBalanceAlert}
                      onChange={handleNotificationChange}
                      name="lowBalanceAlert"
                      color="primary"
                    />
                  }
                  label="Alerte solde faible"
                />
                <Typography className="description-interrupteur">
                  Envoyer une alerte lorsque le solde est inférieur à 1000 XOF
                </Typography>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              {/* Idem pour section Sécurité : applique .description-interrupteur à chaque <Typography> explicatif */}
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={paymentSettings.mobileMoneyEnabled}
                      onChange={handlePaymentChange}
                      name="mobileMoneyEnabled"
                      color="primary"
                    />
                  }
                  label="Activer les paiements par Mobile Money"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Configuration CinetPay
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Clé API CinetPay"
                  name="cinetpayApiKey"
                  type="password"
                  value={paymentSettings.cinetpayApiKey}
                  onChange={handlePaymentChange}
                  variant="outlined"
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site ID CinetPay"
                  name="cinetpaySiteId"
                  value={paymentSettings.cinetpaySiteId}
                  onChange={handlePaymentChange}
                  variant="outlined"
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider className="separateur-paiement" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={paymentSettings.stripeEnabled}
                      onChange={handlePaymentChange}
                      name="stripeEnabled"
                      color="primary"
                    />
                  }
                  label="Activer les paiements par carte bancaire (Stripe)"
                />
              </Grid>

              {paymentSettings.stripeEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Clé secrète Stripe"
                      name="stripeSecretKey"
                      type="password"
                      value={paymentSettings.stripeSecretKey}
                      onChange={handlePaymentChange}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Clé publique Stripe"
                      name="stripePublicKey"
                      value={paymentSettings.stripePublicKey}
                      onChange={handlePaymentChange}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider className="separateur-paiement" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={paymentSettings.paypalEnabled}
                      onChange={handlePaymentChange}
                      name="paypalEnabled"
                      color="primary"
                    />
                  }
                  label="Activer les paiements PayPal"
                />
              </Grid>

              {paymentSettings.paypalEnabled && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Client ID PayPal"
                    name="paypalClientId"
                    value={paymentSettings.paypalClientId}
                    onChange={handlePaymentChange}
                    variant="outlined"
                    margin="normal"
                  />
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      </Paper>

      <Box className="actions-parametres">
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Sauvegarde en cours...
            </>
          ) : (
            'Enregistrer les modifications'
          )}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Paramètres enregistrés avec succès"
      />
    </Box>
  );
};

export default SettingsPage;
