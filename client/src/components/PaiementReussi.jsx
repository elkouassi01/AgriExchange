import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { buildApiUrl } from '../config/api';

const PaiementReussi = () => {
  const [searchParams] = useSearchParams();
  const txId = searchParams.get('transaction_id') || searchParams.get('tx_id');

  const [status, setStatus]   = useState('checking'); // checking | paid | pending | error
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!txId) {
      setStatus('paid'); // pas de txId → flux autre (redirection directe)
      return;
    }

    let cancelled = false;
    const MAX_ATTEMPTS = 10;
    const DELAY_MS = 3000;

    const check = async () => {
      try {
        const res = await fetch(buildApiUrl(`/paiement/status/${txId}`));
        const data = await res.json();

        if (cancelled) return;

        if (data.paid || data.inscriptionCompleted) {
          setStatus('paid');
          return;
        }

        setAttempts((a) => {
          const next = a + 1;
          if (next >= MAX_ATTEMPTS) {
            setStatus('pending');
          } else {
            setTimeout(check, DELAY_MS);
          }
          return next;
        });
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    check();
    return () => { cancelled = true; };
  }, [txId]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {status === 'checking' && (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.title}>Vérification du paiement…</h2>
            <p style={styles.sub}>Confirmation en cours, veuillez patienter.</p>
          </>
        )}

        {status === 'paid' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ ...styles.title, color: '#27ae60' }}>Paiement confirmé !</h2>
            <p style={styles.sub}>
              Votre inscription sur <strong>VivriMarket</strong> a bien été prise en compte.
              Connectez-vous maintenant avec votre email et mot de passe.
            </p>
            <Link to="/connexion" style={styles.btn}>
              Se connecter →
            </Link>
          </>
        )}

        {status === 'pending' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ ...styles.title, color: '#e67e22' }}>Paiement en cours de traitement</h2>
            <p style={styles.sub}>
              Votre paiement est en cours de confirmation. Votre compte sera activé dans
              quelques minutes. Si ce n'est pas le cas après 15 minutes, contactez le support.
            </p>
            <Link to="/" style={styles.btnSecondary}>
              Retour à l'accueil
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ ...styles.title, color: '#e74c3c' }}>Erreur de vérification</h2>
            <p style={styles.sub}>
              Impossible de confirmer votre paiement. Si vous avez été débité, votre compte
              sera activé automatiquement. Contactez-nous si le problème persiste.
            </p>
            <Link to="/" style={styles.btnSecondary}>
              Retour à l'accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f9',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '5px solid #ecf0f1',
    borderTop: '5px solid #27ae60',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    color: '#2c3e50',
  },
  sub: {
    color: '#7f8c8d',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  btn: {
    display: 'inline-block',
    background: '#27ae60',
    color: '#fff',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
  },
  btnSecondary: {
    display: 'inline-block',
    background: '#ecf0f1',
    color: '#2c3e50',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
  },
};

export default PaiementReussi;
