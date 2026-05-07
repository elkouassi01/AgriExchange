import React, { useEffect, useState } from 'react';
import './SettingsPage.css';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import {
  MonetizationOn as PaymentsIcon,
  Notifications as NotificationsIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Settings as GeneralIcon
} from '@mui/icons-material';

const SettingsPage = () => {
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
    const timer = setTimeout(() => {
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

    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (_event, newValue) => setActiveTab(newValue);

  const handleGeneralChange = (event) => {
    const { name, value } = event.target;
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (event) => {
    const { name, checked } = event.target;
    setNotificationSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSecurityChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSecuritySettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPaymentSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch {
      setError('Erreur lors de la sauvegarde des parametres');
    } finally {
      setSaving(false);
    }
  };

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
          Parametres de la plateforme
        </Typography>
        <Typography variant="body1" className="sous-titre-parametres">
          Configurez les parametres generaux, de notification, de securite et de paiement.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="General" icon={<GeneralIcon />} iconPosition="start" />
          <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Securite" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Paiements" icon={<PaymentsIcon />} iconPosition="start" />
        </Tabs>

        <Box className="panneau-onglet-parametres">
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom du site"
                  name="siteName"
                  value={generalSettings.siteName}
                  onChange={handleGeneralChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="URL du site"
                  name="siteUrl"
                  value={generalSettings.siteUrl}
                  onChange={handleGeneralChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Devise"
                  name="currency"
                  value={generalSettings.currency}
                  onChange={handleGeneralChange}
                  margin="normal"
                >
                  <MenuItem value="XOF">XOF</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Fuseau horaire"
                  name="timezone"
                  value={generalSettings.timezone}
                  onChange={handleGeneralChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Langue"
                  name="language"
                  value={generalSettings.language}
                  onChange={handleGeneralChange}
                  margin="normal"
                >
                  <MenuItem value="fr">Francais</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </TextField>
              </Grid>
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
                    />
                  }
                  label="Notifications push"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.newsletterEnabled}
                      onChange={handleNotificationChange}
                      name="newsletterEnabled"
                    />
                  }
                  label="Newsletter hebdomadaire"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.lowBalanceAlert}
                      onChange={handleNotificationChange}
                      name="lowBalanceAlert"
                    />
                  }
                  label="Alerte solde faible"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={handleSecurityChange}
                      name="twoFactorAuth"
                    />
                  }
                  label="Activer l'authentification a deux facteurs"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.passwordComplexity}
                      onChange={handleSecurityChange}
                      name="passwordComplexity"
                    />
                  }
                  label="Exiger des mots de passe complexes"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tentatives de connexion max"
                  name="loginAttempts"
                  type="number"
                  value={securitySettings.loginAttempts}
                  onChange={handleSecurityChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expiration de session (minutes)"
                  name="sessionTimeout"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecurityChange}
                  margin="normal"
                />
              </Grid>
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
                    />
                  }
                  label="Activer les paiements Mobile Money"
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
                  label="Cle API CinetPay"
                  name="cinetpayApiKey"
                  type="password"
                  value={paymentSettings.cinetpayApiKey}
                  onChange={handlePaymentChange}
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
                    />
                  }
                  label="Activer Stripe"
                />
              </Grid>

              {paymentSettings.stripeEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cle secrete Stripe"
                      name="stripeSecretKey"
                      type="password"
                      value={paymentSettings.stripeSecretKey}
                      onChange={handlePaymentChange}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cle publique Stripe"
                      name="stripePublicKey"
                      value={paymentSettings.stripePublicKey}
                      onChange={handlePaymentChange}
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
                    />
                  }
                  label="Activer PayPal"
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
              Sauvegarde...
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
        onClose={() => setSuccess(false)}
        message="Parametres enregistres avec succes"
      />
    </Box>
  );
};

export default SettingsPage;
