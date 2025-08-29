import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
    scrollPosition: number;
}

const Header: React.FC<HeaderProps> = ({ scrollPosition }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutNotification, setShowLogoutNotification] = useState(false);
    const currentPath = location.pathname;

    const isActive = (path: string) => {
        if (path === '/') {
            return currentPath === '/';
        }
        return currentPath.startsWith(path);
    };

    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            const result = await signOut();
            if (result.success) {
                // Notification de déconnexion réussie
                setShowLogoutNotification(true);
                setTimeout(() => {
                    setShowLogoutNotification(false);
                    navigate('/');
                }, 1500);
            } else {
                console.error('Erreur lors de la déconnexion:', result.error);
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        } finally {
            setIsSigningOut(false);
            setShowUserMenu(false);
        }
    };

    return (
        <>
            {showLogoutNotification && (
                <div className="logout-notification">
                    <div className="notification-content">
                        <span className="notification-icon">✅</span>
                        <span>Déconnexion réussie !</span>
                    </div>
                </div>
            )}
            <header className={`dynamic-header ${scrollPosition > 50 ? 'scrolled' : ''}`}>
            <nav className="nav-container">
                <div className="logo">
                    <img src={"logo-batidevis-removebg.png"} alt="BatiDevis Logo" className="logo-img" />
                </div>
                <div className="nav-links">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>ACCUEIL</Link>
                    <Link to="/maquette" className={`nav-link ${isActive('/maquette') ? 'active' : ''}`}>MAQUETTE</Link>
                    <Link to="/tarifs" className={`nav-link ${isActive('/tarifs') ? 'active' : ''}`}>TARIFS</Link>
                    
                    {/* Afficher "MES DEVIS & FACTURES" seulement si l'utilisateur est connecté */}
                    {user && (
                        <Link to="/mes-devis-factures" className={`nav-link ${isActive('/mes-devis-factures') ? 'active' : ''}`}>MES DEVIS & FACTURES</Link>
                    )}
                    
                    {user ? (
                        <div className="user-menu-container">
                            <button 
                                className="user-menu-button"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                            >
                                <span className="user-name">{user.first_name || user.email}</span>
                                <span className="user-arrow">▼</span>
                            </button>
                            {showUserMenu && (
                                <div className={`user-menu ${isSigningOut ? 'closing' : ''}`}>
                                    <div className="user-info">
                                        <p className="user-email">{user.email}</p>
                                        {user.company_name && (
                                            <p className="user-company">{user.company_name}</p>
                                        )}
                                    </div>
                                    <button 
                                        className={`user-menu-item ${isSigningOut ? 'signing-out' : ''}`}
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                    >
                                        {isSigningOut ? (
                                            <>
                                                <span className="loading-spinner"></span>
                                                Déconnexion...
                                            </>
                                        ) : (
                                            <>
                                                <span className="logout-icon">🚪</span>
                                                Se déconnecter
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/connexion" className="button_connexion">CONNEXION / INSCRIPTION</Link>
                    )}
                </div>
            </nav>
        </header>
        </>
    );
};

export default Header; 