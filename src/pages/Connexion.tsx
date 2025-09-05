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
    
    const [showTermsModal, setShowTermsModal] = useState(false);

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
        setLoading(true);
        setError(null);
        setSuccess(null);

        try { 
            const result = await signIn({
                email: loginForm.email,
                password: loginForm.password
            }); 

            if (result.success) { 
                setSuccess('Connexion réussie !');
                setLoading(false);
                // Redirection immédiate sans délai
                navigate('/');
            } else { 
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
            setError('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité RGPD');
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
                                    <div className="rgpd-section">
                                        <label className="terms">
                                            <input 
                                                type="checkbox" 
                                                checked={signupForm.acceptTerms}
                                                onChange={(e) => setSignupForm({...signupForm, acceptTerms: e.target.checked})}
                                                required
                                            />
                                            <span>
                                                J'accepte les{' '}
                                                <button 
                                                    type="button" 
                                                    className="terms-link"
                                                    onClick={() => setShowTermsModal(true)}
                                                >
                                                    conditions d'utilisation et la politique de confidentialité RGPD
                                                </button>
                                            </span>
                                        </label>
                                        <p className="rgpd-info">
                                            🔒 Vos données personnelles sont protégées conformément au RGPD
                                        </p>
                                    </div>
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
            
            {/* Modal des termes et conditions RGPD */}
            {showTermsModal && (
                <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="terms-modal-header">
                            <h2>Conditions d'utilisation et Politique de confidentialité RGPD</h2>
                            <button 
                                className="terms-modal-close"
                                onClick={() => setShowTermsModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="terms-modal-body">
                            <section>
                                <h3>📄 1. Conditions d'utilisation</h3>
                                <h4>1.1 Objet</h4>
                                <p>
                                    BatiDevis est une plateforme SaaS dédiée aux professionnels du BTP pour la création, 
                                    la gestion et l'envoi de devis et factures. En créant un compte, vous acceptez ces conditions.
                                </p>
                                
                                <h4>1.2 Utilisation du service</h4>
                                <ul>
                                    <li>Le service est réservé aux professionnels du BTP</li>
                                    <li>Vous vous engagez à fournir des informations exactes</li>
                                    <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                                    <li>L'utilisation doit respecter la législation en vigueur</li>
                                </ul>
                                
                                <h4>1.3 Propriété intellectuelle</h4>
                                <p>
                                    BatiDevis reste propriétaire de sa plateforme. Vos données vous appartiennent 
                                    et peuvent être exportées à tout moment.
                                </p>
                            </section>
                            
                            <section>
                                <h3>🔒 2. Protection des données personnelles (RGPD)</h3>
                                
                                <h4>2.1 Responsable de traitement</h4>
                                <p>
                                    <strong>BatiDevis SAS</strong><br/>
                                    Email: contact@batidevis.fr<br/>
                                    Téléphone: 01 23 45 67 89
                                </p>
                                
                                <h4>2.2 Données collectées</h4>
                                <p>Nous collectons les données suivantes :</p>
                                <ul>
                                    <li><strong>Données d'identification :</strong> nom, prénom, email, téléphone</li>
                                    <li><strong>Données professionnelles :</strong> nom de l'entreprise, secteur d'activité</li>
                                    <li><strong>Données de connexion :</strong> adresse IP, logs de connexion</li>
                                    <li><strong>Données d'usage :</strong> devis créés, interactions avec la plateforme</li>
                                </ul>
                                
                                <h4>2.3 Finalités du traitement</h4>
                                <ul>
                                    <li>Gestion de votre compte utilisateur</li>
                                    <li>Fourniture des services BatiDevis</li>
                                    <li>Support client et assistance technique</li>
                                    <li>Amélioration de nos services</li>
                                    <li>Respect des obligations légales</li>
                                </ul>
                                
                                <h4>2.4 Base légale</h4>
                                <p>
                                    Le traitement est fondé sur l'exécution du contrat de service et sur votre consentement 
                                    pour certaines finalités spécifiques.
                                </p>
                                
                                <h4>2.5 Durée de conservation</h4>
                                <ul>
                                    <li><strong>Compte actif :</strong> pendant toute la durée de l'abonnement</li>
                                    <li><strong>Après résiliation :</strong> 3 ans pour les obligations comptables</li>
                                    <li><strong>Données de connexion :</strong> 12 mois maximum</li>
                                </ul>
                                
                                <h4>2.6 Vos droits RGPD</h4>
                                <p>Conformément au RGPD, vous disposez des droits suivants :</p>
                                <ul>
                                    <li><strong>Droit d'accès :</strong> consulter vos données</li>
                                    <li><strong>Droit de rectification :</strong> corriger vos données</li>
                                    <li><strong>Droit à l'effacement :</strong> supprimer vos données</li>
                                    <li><strong>Droit à la limitation :</strong> limiter le traitement</li>
                                    <li><strong>Droit à la portabilité :</strong> récupérer vos données</li>
                                    <li><strong>Droit d'opposition :</strong> s'opposer au traitement</li>
                                    <li><strong>Droit de retrait du consentement :</strong> à tout moment</li>
                                </ul>
                                
                                <p>
                                    Pour exercer ces droits, contactez-nous à : <strong>contact@batidevis.fr</strong>
                                </p>
                                
                                <h4>2.7 Sécurité des données</h4>
                                <ul>
                                    <li>Chiffrement des données en transit et au repos</li>
                                    <li>Accès restreint aux données personnelles</li>
                                    <li>Sauvegardes régulières et sécurisées</li>
                                    <li>Surveillance continue de la sécurité</li>
                                </ul>
                                
                                <h4>2.8 Cookies</h4>
                                <p>
                                    Nous utilisons des cookies techniques nécessaires au fonctionnement du service. 
                                    Vous pouvez les désactiver dans votre navigateur.
                                </p>
                                
                                <h4>2.9 Transferts de données</h4>
                                <p>
                                    Vos données sont hébergées en Europe (Union Européenne) et ne font l'objet 
                                    d'aucun transfert vers des pays tiers.
                                </p>
                                
                                <h4>2.10 Réclamation</h4>
                                <p>
                                    Vous pouvez déposer une réclamation auprès de la CNIL : 
                                    <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
                                </p>
                            </section>
                            
                            <section>
                                <h3>⚙️ 3. Dispositions techniques</h3>
                                
                                <h4>3.1 Disponibilité</h4>
                                <p>
                                    Nous nous efforçons d'assurer une disponibilité maximale du service, 
                                    sans pouvoir garantir une disponibilité de 100%.
                                </p>
                                
                                <h4>3.2 Maintenance</h4>
                                <p>
                                    Des opérations de maintenance peuvent occasionner des interruptions temporaires, 
                                    signalées à l'avance quand c'est possible.
                                </p>
                            </section>
                            
                            <section>
                                <h3>⚖️ 4. Dispositions légales</h3>
                                
                                <h4>4.1 Modification des conditions</h4>
                                <p>
                                    Ces conditions peuvent être modifiées. Vous serez informé par email 
                                    de toute modification importante.
                                </p>
                                
                                <h4>4.2 Droit applicable</h4>
                                <p>
                                    Ces conditions sont soumises au droit français. 
                                    Tout litige relève des tribunaux de Paris.
                                </p>
                            </section>
                            
                            <div className="terms-date">
                                <p><strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                        
                        <div className="terms-modal-footer">
                            <button 
                                className="terms-accept-btn"
                                onClick={() => {
                                    setSignupForm({...signupForm, acceptTerms: true});
                                    setShowTermsModal(false);
                                }}
                            >
                                ✓ J'accepte ces conditions
                            </button>
                            <button 
                                className="terms-decline-btn"
                                onClick={() => setShowTermsModal(false)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
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