import React from "react";
import Footer from "./Footer";
import "./apropos.css";
import './HomePage.css';
function Apropo() {  
  return (<div className="home-container">
      <section className="apropos">
        <h1>A propos de Agrimarket CI 🌾</h1>
        <p>nous sommes une platform web qui offre la possibilité au client d'interagir de maniere libre avec les agriculteurs</p>
        <p> Nous mettons en relation acheteurs et vendeurs de denrées fraîches. Vous souhaitez interagir avec le monde agricole
          et une plateforme simple et fiable pour informer vos clients sur vous, votre plantation et vos denrées ?</p>
          <p>Agrimarket.com vous offre les solutions dont vous avez besoin pour acheter, vendre et vous faire connaitre,
             au quotidien ! </p><p>Nous sommes présents dans le secteur agricole depuis 15 ans et, comme vous le savez,
              le marché est difficile. Acheteurs et vendeurs veulent toujours la même chose :
             du PROFIT ! L'agriculture est le secteur où l'information fait vraiment la différence.
          </p>
          <p>Dans un secteur où les prix fluctuent quotidiennement, nous vous tenons informés.</p>
           <p>  Agrixchange.net est là pour vous simplifier la vie et vous permettre de saisir les opportunités de prix.</p> 
           <p>Parfois, 
            ce n'est pas le prix qui compte, si vous êtes le seul à avoir le stock !</p> 
           <p> Agrixchange.net est là pour vous aider à gérer vos risques.</p>
            <p>Nous avons la solution pour mettre vos prix actualisés entre les mains de VRAIS acheteurs du monde entier.</p>
          <p> Agrixchange.net est le moyen le plus simple d'obtenir directement auprès de l'acheteur des prix actualisés 
              régulièrement dans plusieurs pays tout au long de l'année.</p>
          <p> Une méthode adaptée à votre rythme de vie actif. Citation de Sénèque : 
               « La chance est ce qui arrive quand la préparation rencontre l'opportunité. »</p>


      </section>
      <Footer />
      </div>
    );
}

export default Apropo;