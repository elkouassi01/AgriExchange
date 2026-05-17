import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Navigation, MapPin, Leaf, Filter, X, Loader, Lock } from 'lucide-react';
import api from '../services/axiosConfig';
import './MapPage.css';

// Correction icônes Leaflet avec Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const farmerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Composant interne pour recentrer la carte
const MapRecenterer = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 12, { animate: true });
  }, [center, map]);
  return null;
};

const COTE_IVOIRE_CENTER = [7.539989, -5.547080];
const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

const MapPage = () => {
  const [farmers, setFarmers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [userPos, setUserPos]       = useState(null);
  const [locating, setLocating]     = useState(false);
  const [locError, setLocError]     = useState('');
  const [radius, setRadius]         = useState(20);
  const [showFilter, setShowFilter] = useState(false);
  const [mapCenter, setMapCenter]   = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess]         = useState(false);

  useEffect(() => {
    api.get('/map/access')
      .then(res => { setHasAccess(res.data.hasAccess === true); })
      .catch(() => { setHasAccess(false); })
      .finally(() => setAccessChecked(true));
  }, []);

  const fetchFarmers = useCallback(async (lat, lng, km) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lat != null) { params.set('lat', lat); params.set('lng', lng); }
      if (km != null)  { params.set('radius', km); }
      const res = await api.get(`/map/farmers?${params}`);
      setFarmers(res.data.farmers || []);
    } catch {
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFarmers(); }, [fetchFarmers]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      return setLocError("Votre navigateur ne supporte pas la géolocalisation.");
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        setUserPos(pos);
        setMapCenter(pos);
        setLocating(false);
        fetchFarmers(coords.latitude, coords.longitude, radius);
      },
      () => {
        setLocating(false);
        setLocError("Position refusée. Autorisez la géolocalisation dans votre navigateur.");
      },
      { timeout: 10000 }
    );
  };

  const handleRadiusChange = (km) => {
    setRadius(km);
    if (userPos) fetchFarmers(userPos[0], userPos[1], km);
    setShowFilter(false);
  };

  const handleReset = () => {
    setUserPos(null);
    setMapCenter(COTE_IVOIRE_CENTER);
    fetchFarmers();
  };

  if (!accessChecked) {
    return (
      <div className="mp-container">
        <div className="mp-empty">
          <Loader size={32} className="mp-spin" />
          <p>Vérification de l'accès…</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mp-container">
        <div className="mp-paywall">
          <div className="mp-paywall__icon"><Lock size={48} strokeWidth={1.5} /></div>
          <h2 className="mp-paywall__title">Accès réservé</h2>
          <p className="mp-paywall__desc">
            La carte des agriculteurs est disponible uniquement pour les consommateurs
            ayant déjà effectué un paiement pour contacter un agriculteur.
          </p>
          <p className="mp-paywall__hint">
            Trouvez une denrée qui vous intéresse, payez pour obtenir le contact du vendeur,
            et débloquez automatiquement l'accès à la carte.
          </p>
          <Link to="/produits" className="mp-btn mp-btn--primary mp-paywall__cta">
            <Leaf size={16} /> Découvrir les denrées
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-container">

      {/* ── Header ── */}
      <div className="mp-header">
        <div className="mp-header__left">
          <h1 className="mp-title"><MapPin size={22} /> Carte des agriculteurs</h1>
          <p className="mp-sub">
            {loading ? 'Chargement…' : `${farmers.length} agriculteur${farmers.length > 1 ? 's' : ''} géolocalisé${farmers.length > 1 ? 's' : ''}`}
            {userPos && ` · dans un rayon de ${radius} km`}
          </p>
        </div>
        <div className="mp-header__actions">
          {/* Filtre rayon */}
          <div className="mp-filter-wrap">
            <button
              className={`mp-btn mp-btn--outline ${showFilter ? 'mp-btn--active' : ''}`}
              onClick={() => setShowFilter((v) => !v)}
              disabled={!userPos}
              title={!userPos ? "Activez d'abord « Autour de moi »" : ''}
            >
              <Filter size={16} /> Rayon : {radius} km
            </button>
            {showFilter && (
              <div className="mp-filter-dropdown">
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    className={`mp-filter-opt ${radius === km ? 'mp-filter-opt--active' : ''}`}
                    onClick={() => handleRadiusChange(km)}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Autour de moi */}
          {userPos ? (
            <button className="mp-btn mp-btn--outline" onClick={handleReset}>
              <X size={16} /> Réinitialiser
            </button>
          ) : (
            <button className="mp-btn mp-btn--primary" onClick={handleLocateMe} disabled={locating}>
              {locating
                ? <><Loader size={16} className="mp-spin" /> Localisation…</>
                : <><Navigation size={16} /> Autour de moi</>}
            </button>
          )}
        </div>
      </div>

      {locError && <div className="mp-alert">{locError}</div>}

      {/* ── Carte ── */}
      <div className="mp-map-wrap">
        <MapContainer
          center={COTE_IVOIRE_CENTER}
          zoom={7}
          className="mp-map"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapCenter && <MapRecenterer center={mapCenter} />}

          {/* Position utilisateur */}
          {userPos && (
            <Marker position={userPos} icon={userIcon}>
              <Popup><strong>Votre position</strong></Popup>
            </Marker>
          )}

          {/* Markers agriculteurs */}
          {farmers.map((f) => (
            <Marker key={f.id} position={[f.latitude, f.longitude]} icon={farmerIcon}>
              <Popup className="mp-popup">
                <div className="mp-popup__header">
                  {f.photo
                    ? <img src={f.photo} alt={f.nom} className="mp-popup__photo" />
                    : <div className="mp-popup__avatar">{f.fermeNom.charAt(0).toUpperCase()}</div>}
                  <div>
                    <p className="mp-popup__name">{f.fermeNom}</p>
                    <p className="mp-popup__sub">{f.nom}</p>
                  </div>
                </div>
                {f.localisation && (
                  <p className="mp-popup__loc"><MapPin size={12} /> {f.localisation}</p>
                )}
                {f.distance !== null && (
                  <p className="mp-popup__dist">📍 à {f.distance} km de vous</p>
                )}
                {f.categories.length > 0 && (
                  <div className="mp-popup__cats">
                    {f.categories.slice(0, 3).map((c) => (
                      <span key={c} className="mp-popup__cat">{c}</span>
                    ))}
                  </div>
                )}
                <p className="mp-popup__count">
                  <Leaf size={12} /> {f.nbProduits} denrée{f.nbProduits > 1 ? 's' : ''} disponible{f.nbProduits > 1 ? 's' : ''}
                </p>
                <Link
                  to={`/produits?vendeur=${f.id}`}
                  className="mp-popup__btn"
                >
                  Voir les denrées →
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && (
          <div className="mp-map-loading">
            <Loader size={28} className="mp-spin" />
            <p>Chargement des agriculteurs…</p>
          </div>
        )}
      </div>

      {/* ── Liste résultats ── */}
      {farmers.length > 0 && (
        <div className="mp-list">
          <h2 className="mp-list__title">
            {userPos ? `${farmers.length} agriculteur${farmers.length > 1 ? 's' : ''} autour de vous` : 'Tous les agriculteurs géolocalisés'}
          </h2>
          <div className="mp-list__grid">
            {farmers.map((f) => (
              <Link key={f.id} to={`/produits?vendeur=${f.id}`} className="mp-card">
                <div className="mp-card__top">
                  {f.photo
                    ? <img src={f.photo} alt={f.fermeNom} className="mp-card__photo" />
                    : <div className="mp-card__avatar">{f.fermeNom.charAt(0).toUpperCase()}</div>}
                  <div className="mp-card__info">
                    <p className="mp-card__farm">{f.fermeNom}</p>
                    <p className="mp-card__name">{f.nom}</p>
                    {f.localisation && <p className="mp-card__loc"><MapPin size={11} /> {f.localisation}</p>}
                  </div>
                  {f.distance !== null && (
                    <span className="mp-card__dist">{f.distance} km</span>
                  )}
                </div>
                {f.categories.length > 0 && (
                  <div className="mp-card__cats">
                    {f.categories.slice(0, 4).map((c) => (
                      <span key={c} className="mp-card__cat">{c}</span>
                    ))}
                  </div>
                )}
                <p className="mp-card__count"><Leaf size={12} /> {f.nbProduits} denrée{f.nbProduits > 1 ? 's' : ''}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && farmers.length === 0 && (
        <div className="mp-empty">
          <MapPin size={40} strokeWidth={1.2} />
          <p>{userPos ? `Aucun agriculteur dans un rayon de ${radius} km.` : 'Aucun agriculteur géolocalisé pour le moment.'}</p>
          {userPos && (
            <button className="mp-btn mp-btn--outline" onClick={() => handleRadiusChange(100)}>
              Élargir à 100 km
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default MapPage;
