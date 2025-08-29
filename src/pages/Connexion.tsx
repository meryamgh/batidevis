import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Connexion.css';
import Header from '../components/Header';

const Connexion: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [isLogin, setIsLogin] = useState(true);

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: false,
            mirror: true
        });

        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="home-container">
        <div className="background-tarifs">
        </div>
            
            <Header scrollPosition={scrollPosition} />
            <br></br>
            <main className="auth-main">
                <div className="auth-box" data-aos="fade-up">
                    <div className="auth-switch">
                        <button 
                            className={`switch-btn ${isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(true)}
                        >
                            SE CONNECTER
                        </button>
                        <button 
                            className={`switch-btn ${!isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(false)}
                        >
                            S'INSCRIRE
                        </button>
                    </div>

                    <div className="auth-form-container">
                        {isLogin ? (
                            <form className="auth-form" data-aos="fade-right">
                                <h2>CONNEXION</h2>
                                <div className="form-group">
                                    <input type="email" placeholder="Email" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input type="password" placeholder="Mot de passe" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-options">
                                    <label className="remember-me">
                                        <input type="checkbox" />
                                        <span>Se souvenir de moi</span>
                                    </label>
                                    <a href="/reset-password" className="forgot-password">Mot de passe oublié ?</a>
                                </div>
                                <button type="submit" className="auth-submit">SE CONNECTER</button>
                                <div className="social-auth">
                                    <p>Ou connectez-vous avec</p>
                                    <div className="social-buttons">
                                        <button type="button" className="google-btn">
                                            <img src="/assets/google_icone.jpg" alt="Google" />
                                            Google
                                        </button>
                                        <button type="button" className="linkedin-btn">
                                            <img src="/assets/linkedin.png" alt="LinkedIn" />
                                            LinkedIn
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form className="auth-form" data-aos="fade-left">
                                <h2>INSCRIPTION</h2>
                                <div className="form-group">
                                    <input type="text" placeholder="Nom complet" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input type="email" placeholder="Email professionnel" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input type="text" placeholder="Nom de l'entreprise" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input type="password" placeholder="Mot de passe" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input type="password" placeholder="Confirmer le mot de passe" />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-options">
                                    <label className="terms">
                                        <input type="checkbox" />
                                        <span>J'accepte les conditions d'utilisation et la politique de confidentialité</span>
                                    </label>
                                </div>
                                <button type="submit" className="auth-submit">S'INSCRIRE</button>
                                <div className="social-auth">
                                    <p>Ou inscrivez-vous avec</p>
                                    <div className="social-buttons">
                                        <button type="button" className="google-btn">
                                            <img src="/assets/google_icone.jpg" alt="Google" />
                                            Google
                                        </button>
                                        <button type="button" className="linkedin-btn">
                                            <img src="/assets/linkedin.png" alt="LinkedIn" />
                                            LinkedIn
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            <br></br>
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <img src={"logo-batidevis-removebg.png"} alt="BatiDevis Logo" className="footer-logo" />
                            <p>La solution innovante pour vos devis et factures dans le BTP</p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>Navigation</h4>
                                <a href="/">Accueil</a>
                                <a href="/fonctionnalites">Fonctionnalités</a>
                                <a href="/tarifs">Tarifs</a>
                                <a href="/contact">Contact</a>
                            </div>
                            <div className="footer-column">
                                <h4>Légal</h4>
                                <a href="/mentions-legales">Mentions légales</a>
                                <a href="/cgv">CGV</a>
                                <a href="/confidentialite">Confidentialité</a>
                            </div>
                            <div className="footer-column">
                                <h4>Contact</h4>
                                <p><i className="fas fa-phone"></i> 01 23 45 67 89</p>
                                <p><i className="fas fa-envelope"></i> contact@batidevis.fr</p>
                                <div className="social-links">
                                    <a href="#" className="social-link"><i className="fab fa-linkedin"></i></a>
                                    <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                                    <a href="#" className="social-link"><i className="fab fa-facebook"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} BatiDevis. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Connexion;