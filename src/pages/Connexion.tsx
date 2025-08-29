import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Connexion.css';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Connexion: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // États pour les formulaires
    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    
    const [signupForm, setSignupForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        companyName: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    });

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

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

    // Fonctions de gestion des formulaires
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('handleLoginSubmit appelé');
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            console.log('Appel de signIn...');
            const result = await signIn({
                email: loginForm.email,
                password: loginForm.password
            });
            console.log('Résultat signIn reçu:', result);

            if (result.success) {
                console.log('Connexion réussie, redirection...');
                setSuccess('Connexion réussie !');
                setLoading(false);
                // Redirection immédiate sans délai
                navigate('/');
            } else {
                console.log('Erreur de connexion:', result.error);
                setError(result.error || 'Erreur lors de la connexion');
                setLoading(false);
            }
        } catch (err) {
            console.error('Exception dans handleLoginSubmit:', err);
            setError('Erreur lors de la connexion');
            setLoading(false);
        }
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validation des mots de passe
        if (signupForm.password !== signupForm.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (signupForm.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }

        if (!signupForm.acceptTerms) {
            setError('Vous devez accepter les conditions d\'utilisation');
            setLoading(false);
            return;
        }

        try {
            const result = await signUp({
                email: signupForm.email,
                password: signupForm.password,
                first_name: signupForm.firstName,
                last_name: signupForm.lastName,
                company_name: signupForm.companyName
            });

            console.log('Connexion.tsx - Résultat inscription:', result);

            if (result.success && result.user) {
                // Inscription réussie
                setSuccess('🎉 Inscription réussie ! Vous êtes maintenant connecté.');
                
                // Rediriger vers la page d'accueil après un délai
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                // Gestion spécifique des erreurs d'inscription
                if (result.error?.includes('already registered') || result.error?.includes('user_already_exists')) {
                    setError('Cet email est déjà utilisé.');
                } else {
                    setError(result.error || 'Erreur lors de l\'inscription');
                }
            }
        } catch (err) {
            console.error('Connexion.tsx - Erreur inscription:', err);
            setError('Erreur lors de l\'inscription');
        } finally {
            setLoading(false);
        }
    };

    


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
                        {/* Messages d'erreur et de succès */}
                        {error && (
                            <div className="auth-message error" data-aos="fade-down">
                                {error} 
                            </div>
                        )}
                        {success && (
                            <div className="auth-message success" data-aos="fade-down">
                                {success}
                            </div>
                        )}

                        {isLogin ? (
                            <form className="auth-form slide-in-right" onSubmit={handleLoginSubmit}>
                                <h2>CONNEXION</h2>
                                <div className="form-group">
                                    <input 
                                        type="email" 
                                        placeholder="Email" 
                                        value={loginForm.email}
                                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-group">
                                    <input 
                                        type="password" 
                                        placeholder="Mot de passe" 
                                        value={loginForm.password}
                                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-options">
                                    <label className="remember-me">
                                        <input 
                                            type="checkbox" 
                                            checked={loginForm.rememberMe}
                                            onChange={(e) => setLoginForm({...loginForm, rememberMe: e.target.checked})}
                                        />
                                        <span>Se souvenir de moi</span>
                                    </label>
                                    <a href="/reset-password" className="forgot-password">Mot de passe oublié ?</a>
                                </div>
                                <button 
                                    type="submit" 
                                    className="auth-submit" 
                                    disabled={loading}
                                >
                                    {loading ? 'CONNEXION...' : 'SE CONNECTER'}
                                </button>
                                
                            </form>
                        ) : (
                            <form className="auth-form signup-form slide-in-left" onSubmit={handleSignupSubmit}>
                                <h2 className="full-width">INSCRIPTION</h2>
                                
                                {/* Première colonne */}
                                <div className="form-group">
                                    <input 
                                        type="text" 
                                        placeholder="Prénom" 
                                        value={signupForm.firstName}
                                        onChange={(e) => setSignupForm({...signupForm, firstName: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                
                                <div className="form-group">
                                    <input 
                                        type="text" 
                                        placeholder="Nom" 
                                        value={signupForm.lastName}
                                        onChange={(e) => setSignupForm({...signupForm, lastName: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                
                                {/* Email en pleine largeur */}
                                <div className="form-group full-width">
                                    <input 
                                        type="email" 
                                        placeholder="Email professionnel" 
                                        value={signupForm.email}
                                        onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                
                                {/* Nom de l'entreprise en pleine largeur */}
                                <div className="form-group full-width">
                                    <input 
                                        type="text" 
                                        placeholder="Nom de l'entreprise" 
                                        value={signupForm.companyName}
                                        onChange={(e) => setSignupForm({...signupForm, companyName: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                
                                {/* Mots de passe en 2 colonnes */}
                                <div className="form-group">
                                    <input 
                                        type="password" 
                                        placeholder="Mot de passe" 
                                        value={signupForm.password}
                                        onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                
                                <div className="form-group">
                                    <input 
                                        type="password" 
                                        placeholder="Confirmer le mot de passe" 
                                        value={signupForm.confirmPassword}
                                        onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                                        required
                                    />
                                    <span className="focus-border"></span>
                                </div>
                                <div className="form-options">
                                    <label className="terms">
                                        <input 
                                            type="checkbox" 
                                            checked={signupForm.acceptTerms}
                                            onChange={(e) => setSignupForm({...signupForm, acceptTerms: e.target.checked})}
                                            required
                                        />
                                        <span>J'accepte les conditions d'utilisation et la politique de confidentialité</span>
                                    </label>
                                </div>
                                <button 
                                    type="submit" 
                                    className="auth-submit"
                                    disabled={loading}
                                >
                                    {loading ? 'INSCRIPTION...' : 'S\'INSCRIRE'}
                                </button>
                                
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