// src/components/Footer.jsx

import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} AgriExchange. Tous droits réservés.</p>
      <p>Conçu avec 🌱 pour l'agriculture locale.</p>
    </footer>
  );
}

export default Footer;
