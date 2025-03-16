import React from "react";
import "../styles/Main.css";
import { motion } from "framer-motion";

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
        <div className="header-transition"></div>
      </header>

      <div className="cta-container">
        <button className="cta-primary">CRÉEZ VOTRE PREMIER DEVIS GRATUITEMENT</button>
  </div>

  <div className="content_home">
        {/* 🎥 Conteneur vidéo façon Apple */}
        <motion.div 
          className="video-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}          
          whileHover={{ scale: 1.02, boxShadow: "0px 15px 40px rgba(0, 0, 0, 0.4)" }}
        >
          {/* Overlay sombre pour améliorer la lisibilité */}
          <div className="video-overlay"></div>

          <video autoPlay loop muted playsInline>
            <source src="Vidéo sans titre.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>

          {/* 🎬 Texte superposé sur la vidéo */}
          <motion.div 
            className="hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <p>PASSEZ DU PLAN AU DEVIS EN QUELQUES SECONDES !</p>
            <br></br>
            <ul className="features-list">
              <li><span className="checkmark">✔</span> UN OUTIL INTUITIF PENSÉ POUR LES ARTISANS DU BTP</li>
              <li><span className="checkmark">✔</span> VOS DEVIS ET FACTURES GÉNÉRÉS EN UN CLIC DEPUIS VOTRE MAQUETTE 3D</li>
              <li><span className="checkmark">✔</span> GAGNEZ DU TEMPS ET CONCENTREZ-VOUS SUR VOS CHANTIERS !</li>
            </ul>
            <br></br>
            <button className="cta">En savoir plus</button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Main;

