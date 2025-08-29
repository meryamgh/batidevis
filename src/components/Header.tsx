import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface HeaderProps {
    scrollPosition: number;
}

const Header: React.FC<HeaderProps> = ({ scrollPosition }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isActive = (path: string) => {
        if (path === '/') {
            return currentPath === '/';
        }
        return currentPath.startsWith(path);
    };

    return (
        <header className={`dynamic-header ${scrollPosition > 50 ? 'scrolled' : ''}`}>
            <nav className="nav-container">
                <div className="logo">
                    <img src={"logo-batidevis-removebg.png"} alt="BatiDevis Logo" className="logo-img" />
                </div>
                <div className="nav-links">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>ACCUEIL</Link>
                    <Link to="/maquette" className={`nav-link ${isActive('/maquette') ? 'active' : ''}`}>MAQUETTE</Link>
                    <Link to="/tarifs" className={`nav-link ${isActive('/tarifs') ? 'active' : ''}`}>TARIFS</Link>
                    <Link to="/mes-devis-factures" className={`nav-link ${isActive('/mes-devis-factures') ? 'active' : ''}`}>MES DEVIS & FACTURES</Link>
                    <Link to="/connexion" className="button_connexion">CONNEXION / INSCRIPTION</Link>
                </div>
            </nav>
        </header>
    );
};

export default Header; 