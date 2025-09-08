import React, { useState, useEffect } from 'react';
import '../styles/Header.css';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const currentPath = location.pathname;

    const isActive = (path: string) => {
        if (path === '/') {
            return currentPath === '/';
        }
        return currentPath.startsWith(path);
    };

    const [isSigningOut, setIsSigningOut] = useState(false);

    // Fermer le menu mobile quand on change de page
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Fermer le menu mobile quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (isMobileMenuOpen && !target.closest('.nav-container')) {
                setIsMobileMenuOpen(false);
            }
            if (showUserMenu && !target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        if (isMobileMenuOpen || showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            // Empêcher le scroll du body quand le menu mobile est ouvert
            if (isMobileMenuOpen) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen, showUserMenu]);

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
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
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
                
                {/* Bouton hamburger pour mobile */}
                <button 
                    className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Toggle mobile menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={closeMobileMenu}>ACCUEIL</Link>
                    <Link to="/maquette" className={`nav-link ${isActive('/maquette') ? 'active' : ''}`} onClick={closeMobileMenu}>MAQUETTE</Link>
                    <Link to="/tarifs" className={`nav-link ${isActive('/tarifs') ? 'active' : ''}`} onClick={closeMobileMenu}>TARIFS</Link>
                    
                    {/* Afficher "MES DEVIS & FACTURES" seulement si l'utilisateur est connecté */}
                    {user && (
                        <Link to="/mes-devis-factures" className={`nav-link ${isActive('/mes-devis-factures') ? 'active' : ''}`} onClick={closeMobileMenu}>MES DEVIS & FACTURES</Link>
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
                                <div className="user-menu">
                                    <Link to="/profil" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                                        Mon profil
                                    </Link>
                                    <button 
                                        className={`user-menu-item logout-item ${isSigningOut ? 'signing-out' : ''}`}
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                    >
                                        {isSigningOut ? (
                                            <>
                                                <span className="loading-spinner"></span>
                                                Déconnexion...
                                            </>
                                        ) : (
                                            <>Se déconnecter</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/connexion" className="button_connexion" onClick={closeMobileMenu}>CONNEXION / INSCRIPTION</Link>
                    )}
                </div>
            </nav>
        </header>
        </>
    );
};

export default Header; 