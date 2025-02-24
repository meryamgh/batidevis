import React from 'react';
import '../styles/Main.css';

const Main: React.FC = () => {
    return (
        <div className="body">
        <header className="top-banner">
        <div className="branding">
            <img src={"logo.png"} alt="Logo MAQDEV" className="site-logo" />
        </div>
        <nav className="main-nav">
            <a href="#" className="active">ACCUEIL</a>
            <a href="#">TARIFS</a>
            <a href="#">MES DEVIS & FACTURES</a>
            <a href="#">FAQ</a>
        <button className="cta-button">CONNEXION/INSCRIPTION</button>
        </nav>
        </header>
        <div className="content_home">
        <div className="hero-text">
            {/* Bannière fixe en haut */}
            <h1>PASSEZ DU PLAN AU DEVIS EN QUELQUES SECONDES !</h1>
            <ul className="features-list">
            <li><span className="checkmark">✔</span> UN OUTIL INTUITIF PENSÉ POUR LES ARTISANS DU BTP</li>
            <li><span className="checkmark">✔</span> VOS DEVIS ET FACTURES GÉNÉRÉS EN UN CLIC DEPUIS VOTRE MAQUETTE 3D</li>
            <li><span className="checkmark">✔</span> GAGNEZ DU TEMPS ET CONCENTREZ-VOUS SUR VOS CHANTIERS !</li>
            </ul>
            <button className="cta-primary">CRÉEZ VOTRE PREMIER DEVIS GRATUITEMENT</button>
        </div>
        <div className="hero-image">
        <img src="Maquette.jpg" alt="Maquette"></img>
        </div>
        </div>
        </div>
        
    );
};

export default Main;

