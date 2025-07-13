import React from "react";
import Footer from "./Footer";
import './TermsPage.css';
import './HomePage.css';
function noservices(){
    return (
<div className="home-container">
      <section className="apropos">
        <h1>Nos services 🌾</h1>
        <h2>Nom de la société</h2>
        <p>Voici la liste des services que nous pouvons forunire  </p>
        <p>entete avec toutes les donnees de votre société</p>
        <p>Nom , adresse telephone fax email</p> 
        <p>numero siret et TVA Intra</p>

        <ul>
            <li>Entete de la société client</li>
            <li>Nom de la société</li>
            <li>Département/Division</li>
            <li>Adresse complete</li>
            <li> Nom de votre interlocuteur</li>
            <li>Position et titre de votre interlocuteur</li>

        </ul>
        <calender>date et lieu</calender>    
        Entete de la société 
      </section>
      <Footer/>
      </div>
    );
}
export default noservices;