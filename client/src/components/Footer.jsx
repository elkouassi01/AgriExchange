// src/components/Footer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import {FaYoutube, FaFacebook} from 'react-icons/fa';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      
      <div class="container">
      <div class="row">
        <div class="footer-col">
          <h4>entreprise</h4>
          <ul>
            <li><Link to="/Appropos">&aacute; propos de nous</Link></li>
            <li><Link to="/noservice">nos services</Link></li>
            
          </ul>
        </div>
        <div class="footer-col">
          <h4>obtenir de l'aide</h4>
          <ul>
            
            <li><Link to="/paiement">méthode de paiement</Link></li>
            <li><Link to="/condition">Termes & Conditions</Link></li>
          
          </ul>
        </div>
        <div class="footer-col">
          <h4>achat en ligne</h4>
          <ul>
            <li><a href="#">produits agricoles</a></li>
            <li><a href="#">élévage</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>suivez nous</h4>
          <div class="social-links">
            <a href="#"><FaFacebook className="icon facebook"/></a>
            <a href="#"><FaYoutube className="icon youtube"/></a>
            <a href="#"><FontAwesomeIcon icon={faEnvelope} /></a>
          
            
        </div>
        </div>
      
      </div>
    <div class="footer-col">
        <ul>
          <li><a>&copy;2025 AgriMarket CI,tout droit Réservé</a></li>

          </ul>
      </div>	
    
     </div>
   
    </footer>
  );
}

export default Footer;

