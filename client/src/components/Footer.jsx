// src/components/Footer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { FaYoutube, FaFacebook } from 'react-icons/fa';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row">
          <div className="footer-col">
            <h4>entreprise</h4>
            <ul>
              <li><Link to="/Appropos">&aacute; propos de nous</Link></li>
              <li><Link to="/noservice">nos services</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>obtenir de l'aide</h4>
            <ul>
              <li><Link to="/paiement">méthode de paiement</Link></li>
              <li><Link to="/condition">Termes & Conditions</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>achat en ligne</h4>
            <ul>
              <li><Link to="#">produits agricoles</Link></li>
              <li><Link to="#">élévage</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>suivez nous</h4>
            <div className="social-links">
              <a href="#"><FaFacebook className="icon facebook" /></a>
              <a href="#"><FaYoutube className="icon youtube" /></a>
              <a href="#"><FontAwesomeIcon icon={faEnvelope} className="icon" /></a>
            </div>
          </div>
        </div>
        
        <div className="footer-col footer-bottom">
          <ul>
            <li>&copy;2025 AgriMarket CI, tout droit Réservé</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;