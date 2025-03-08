import React, { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Home.css';

const Home: React.FC = () => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: false,
            mirror: true
        });

        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };

        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const parallaxStyle = {
        transform: `translate3d(${mousePosition.x / 50}px, ${mousePosition.y / 50}px, 0)`
    };

    return (
        <div className="home-container">
            <div className="video-background">
                <video autoPlay muted loop playsInline className="background-video">
                    <source src="/assets/Vidéo sans titre.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay" style={{
                    opacity: Math.min(scrollPosition / 1000, 0.8)
                }}></div>
            </div>

            <header className="dynamic-header" style={{
                backgroundColor: `rgba(0, 0, 0, ${Math.min(scrollPosition / 500, 0.9)})`
            }}>
                <nav className="nav-container">
                    <div className="logo" data-aos="fade-right">
                        <img src="/assets/logo.png" alt="Devo Logo" className="logo-img" />
                    </div>
                    <div className="nav-links" data-aos="fade-left">
                        <a href="/" className="nav-link active">Accueil</a>
                        <a href="/services" className="nav-link">Services</a>
                        <a href="/about" className="nav-link">À propos</a>
                        <a href="/contact" className="nav-link">Contact</a>
                        <button className="cta-button glow-effect">Commencer</button>
                    </div>
                </nav>
            </header>

            <main>
                <section className="hero-section">
                    <div className="hero-content-wrapper">
                        <div className="hero-content" style={parallaxStyle}>
                            <h1 className="animated-title" data-aos="zoom-in">
                                <span className="gradient-text">Innovez</span>
                                <br />
                                avec Devo
                            </h1>
                            <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                                Transformez vos idées en réalité
                            </p>
                            <div className="interactive-buttons" data-aos="fade-up" data-aos-delay="400">
                                <button className="primary-btn pulse-effect">
                                    <span className="btn-text">Découvrir</span>
                                    <span className="btn-icon">→</span>
                                </button>
                                <button className="secondary-btn hover-effect">
                                    <span className="btn-text">En savoir plus</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="features-section">
                    <h2 className="section-title" data-aos="fade-up">Nos Services</h2>
                    <div className="features-grid">
                        {[
                            { icon: 'rocket', title: 'Innovation', desc: 'Solutions créatives pour votre succès' },
                            { icon: 'shield-alt', title: 'Sécurité', desc: 'Protection maximale de vos données' },
                            { icon: 'chart-line', title: 'Performance', desc: 'Optimisation continue des résultats' }
                        ].map((feature, index) => (
                            <div key={index} 
                                 className="feature-card" 
                                 data-aos="fade-up"
                                 data-aos-delay={index * 100}
                                 style={{
                                     transform: `perspective(1000px) rotateY(${
                                         (mousePosition.x - window.innerWidth / 2) / 50
                                     }deg) rotateX(${
                                         (mousePosition.y - window.innerHeight / 2) / 50
                                     }deg)`
                                 }}>
                                <div className="card-content">
                                    <i className={`fas fa-${feature.icon} feature-icon`}></i>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.desc}</p>
                                    <div className="card-hover">
                                        <span>Explorer →</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="vision-section" data-aos="fade-up">
                    <div className="vision-content" style={{
                        transform: `translate3d(0, ${scrollPosition / 4}px, 0)`
                    }}>
                        <h2>Notre Vision</h2>
                        <p>Créer un futur où la technologie enrichit chaque aspect de notre vie</p>
                    </div>
                    <div className="vision-particles">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} 
                                 className="particle"
                                 style={{
                                     transform: `translate(${Math.sin(scrollPosition / 100 + i) * 50}px, ${Math.cos(scrollPosition / 100 + i) * 50}px)`
                                 }}
                            ></div>
                        ))}
                    </div>
                </section>

                <section className="cta-section" data-aos="fade-up">
                    <div className="cta-content">
                        <h2>Prêt à commencer votre voyage ?</h2>
                        <p>Rejoignez-nous dès aujourd'hui et transformez votre vision en réalité.</p>
                        <button className="cta-button-large pulse-effect">
                            <span className="btn-text">Commencer maintenant</span>
                            <span className="btn-icon">→</span>
                        </button>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-waves">
                    <div className="wave wave1"></div>
                    <div className="wave wave2"></div>
                    <div className="wave wave3"></div>
                </div>
                <div className="footer-content">
                    <div className="footer-section" data-aos="fade-up">
                        <h4>Devo</h4>
                        <p>Innovation et excellence</p>
                    </div>
                    <div className="footer-section" data-aos="fade-up" data-aos-delay="100">
                        <h4>Liens rapides</h4>
                        <a href="/services">Services</a>
                        <a href="/about">À propos</a>
                        <a href="/contact">Contact</a>
                    </div>
                    <div className="footer-section" data-aos="fade-up" data-aos-delay="200">
                        <h4>Suivez-nous</h4>
                        <div className="social-links">
                            <a href="#" className="social-link" aria-label="Twitter">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="#" className="social-link" aria-label="LinkedIn">
                                <i className="fab fa-linkedin"></i>
                            </a>
                            <a href="#" className="social-link" aria-label="GitHub">
                                <i className="fab fa-github"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Devo. Tous droits réservés.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home; 
