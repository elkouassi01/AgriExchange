import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';
import './SellerReviews.css';

const STARS = [1, 2, 3, 4, 5];

function StarRow({ value, onChange, size = 22 }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="sr-star-row">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          className={`sr-star-btn ${s <= (hover || value) ? 'sr-star-btn--on' : ''}`}
          style={{ fontSize: size }}
          onClick={() => onChange && onChange(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          aria-label={`${s} étoile${s > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

function Avatar({ nom, photo }) {
  const initial = (nom || '?')[0].toUpperCase();
  return photo
    ? <img src={photo} alt={nom} className="sr-avatar sr-avatar--img" />
    : <span className="sr-avatar">{initial}</span>;
}

function ReviewCard({ review, currentUserId, onDelete }) {
  const isOwn = review.reviewerId === currentUserId;
  const date  = new Date(review.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="sr-card">
      <div className="sr-card__head">
        <Avatar nom={review.reviewerNom} photo={review.reviewerPhoto} />
        <div className="sr-card__meta">
          <span className="sr-card__name">{review.reviewerNom}</span>
          <StarRow value={review.rating} size={15} />
        </div>
        <span className="sr-card__date">{date}</span>
        {isOwn && (
          <button className="sr-delete-btn" onClick={() => onDelete(review.id)} title="Supprimer mon avis">
            ✕
          </button>
        )}
      </div>
      {review.comment && <p className="sr-card__comment">{review.comment}</p>}
    </div>
  );
}

export default function SellerReviews({ sellerId }) {
  const { user } = useUser();

  const [data, setData]         = useState({ reviews: [], avgRating: null, count: 0 });
  const [loading, setLoading]   = useState(true);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const isConsumer = user?.role === 'consommateur';
  const currentUserId = user?.id || user?._id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/seller/${sellerId}`);
      setData(res.data);
      // Pré-remplir si l'utilisateur a déjà un avis
      const own = res.data.reviews.find(r => r.reviewerId === currentUserId);
      if (own) { setRating(own.rating); setComment(own.comment || ''); }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [sellerId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setFormError('Choisissez une note.'); return; }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      await api.post(`/reviews/seller/${sellerId}`, { rating, comment });
      setFormSuccess('Avis publié !');
      setTimeout(() => setFormSuccess(''), 3000);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erreur lors de la publication.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Supprimer votre avis ?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setRating(0);
      setComment('');
      await load();
    } catch {
      // silently ignore
    }
  };

  const hasOwnReview = data.reviews.some(r => r.reviewerId === currentUserId);

  return (
    <section className="sr-root">
      <div className="sr-header">
        <h3 className="sr-title">Avis sur ce vendeur</h3>
        {data.avgRating !== null && (
          <div className="sr-summary">
            <span className="sr-avg">{data.avgRating.toFixed(1)}</span>
            <StarRow value={Math.round(data.avgRating)} size={18} />
            <span className="sr-count">({data.count} avis)</span>
          </div>
        )}
      </div>

      {/* Formulaire */}
      {isConsumer && (
        <form className="sr-form" onSubmit={handleSubmit}>
          <p className="sr-form__label">
            {hasOwnReview ? 'Modifier votre avis' : 'Laisser un avis'}
          </p>
          <StarRow value={rating} onChange={setRating} size={28} />
          <textarea
            className="sr-form__textarea"
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          {formError   && <p className="sr-form__msg sr-form__msg--err">{formError}</p>}
          {formSuccess && <p className="sr-form__msg sr-form__msg--ok">{formSuccess}</p>}
          <button className="sr-form__btn" disabled={submitting || !rating}>
            {submitting ? 'Publication…' : hasOwnReview ? 'Mettre à jour' : 'Publier'}
          </button>
        </form>
      )}

      {!user && (
        <p className="sr-login-hint">
          <a href="/connexion">Connectez-vous</a> pour laisser un avis.
        </p>
      )}

      {/* Liste */}
      {loading ? (
        <p className="sr-loading">Chargement des avis…</p>
      ) : data.reviews.length === 0 ? (
        <p className="sr-empty">Aucun avis pour l'instant. Soyez le premier !</p>
      ) : (
        <div className="sr-list">
          {data.reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
