import './HomePage.css';
import Footer from './Footer';
import tomate from '../assets/tomate.jpg';
import salade from '../assets/salade.jpg';
import concombre from '../assets/concombre.jpg';
import pomme_terre from '../assets/pomme_terre.jpg';

function HomePage() {
  return (
    <div className="home-container">
      <section className="hero">
        <h1>Bienvenue sur AgriExchange 🌾</h1>
        <p>La plateforme de confiance pour acheter et vendre des produits agricoles en toute simplicité.</p>
      </section>

       <section className="sample-products">
        <h2>Nos produits phares</h2>
        <div className="products-grid">
          <div className="product-card">
            <img src={tomate} alt="Tomates Bio" />
            <p>🍅 Tomates Bio</p>
          </div>
          <div className="product-card">
            <img src={salade} alt="Salades Fraîches" />
            <p>🥬 Salades Fraîches</p>
          </div>
          <div className="product-card">
            <img src={pomme_terre} alt="Pommes de Terre" />
            <p>🥔 Pommes de Terre</p>
          </div>
          <div className="product-card">
            <img src={concombre} alt="Concombre frais" />
            <p>🥒 Concombre Frais</p>
          </div>
          </div> 
          <a href="#" className="cta-button">Voir tous les produits</a>  
      </section>
      <section className="about">
        <h2>À propos</h2>
        <p>
          AgriExchange connecte directement les agriculteurs et les consommateurs. 
          Nos produits sont frais, locaux et respectueux de la nature.
        </p>
      </section>
      <Footer />
    </div>
  );
  
}

export default HomePage;
