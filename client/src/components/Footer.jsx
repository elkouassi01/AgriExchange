// src/components/Footer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { FaYoutube, FaFacebook, FaInstagram, FaPhone } from 'react-icons/fa';
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
              <a href="URL_OF_YOUR_FACEBOOK_PAGE"><FaFacebook className="icon facebook" /></a>
              <a href="URL_OF_YOUR_INSTAGRAM_PAGE"><FaInstagram className="icon instagram" /></a>
              <a href="mailto:information@vivrimarket.com"><FontAwesomeIcon icon={faEnvelope} className="icon" /></a>
              <a href="tel:"><FaPhone className="icon instagram" /></a>
              </div>
                  &copy;2025 VivriMarket CI, tout droit Réservé 
          </div>
        </div>        
        <div className="footer-col footer-bottom">
         <p> &copy;2025 VivriMarket CI, tout droit Réservé</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;