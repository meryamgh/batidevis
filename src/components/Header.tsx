import React from 'react';
import '../styles/Header.css';

interface HeaderProps {
    scrollPosition: number;
}

const Header: React.FC<HeaderProps> = ({ scrollPosition }) => {
    return (
        <header className="dynamic-header">
            <nav className="nav-container">
                <div className="logo" data-aos="fade-right">
                    <img src="/assets/logo.svg" alt="Devo Logo" className="logo-img" />
                </div>
                <div className="nav-links" data-aos="fade-left">
                    <a href="/" className="nav-link active">ACCUEIL</a>
                    <a href="/Maquette" className="nav-link">MAQUETTE</a>
                    <a href="/Tarifs" className="nav-link">TARIFS</a>
                    <a href="/Devis" className="nav-link">MES DEVIS & FACTURES</a>
                    <button className="button_connexion">CONNEXION / INSCRIPTION</button>
                </div>
            </nav>
        </header>
    );
};

export default Header; 