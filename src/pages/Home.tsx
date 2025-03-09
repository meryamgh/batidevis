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
                    <source src="/assets/Video_Home.mp4" type="video/mp4" />
                </video>
                <div className="video-overlay" style={{
                    opacity: Math.min(scrollPosition / 1000, 0.8)
                }}></div>
            </div>

            <header className="dynamic-header" style={{
                backgroundColor: `rgba(0, 0, 0, ${Math.min(scrollPosition / 500, 0.9)})`,
                boxShadow: `0 10px 17px rgba(0, 0, 0, 0.46)`
            }}>
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

            <main>
                <section className="hero-section">
                    <div className="hero-content-wrapper">
                        <div className="hero-content" style={parallaxStyle}>
                            <h1 className="animated-title" data-aos="zoom-in">
                                <span className="gradient-text">PASSEZ DU PLAN AU DEVIS EN QUELQUES SECONDES</span>
                                <br />
                                <p className="batidevis">AVEC BATIDEVIS</p>
                            </h1>
                            <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                            <span className="cercle">○</span> un outil intuitif pensé pour les artisants du btp
                            <br></br><br></br>
                            <span className="cercle">○</span> vos devis et factures générés en un clic depuis votre maquette 3D
                            <br></br><br></br>
                            <span className="cercle">○</span> gagnez du temps et concentrez-vous sur vos chantiers !
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

                <section className="dynamic-showcase">
                <span className="title_showcase"> POURQUOI BATIDEVIS ? </span>
                    <div className="showcase-container">
                        <div className="showcase-slider">
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_1.png" alt="Simplicité" />
                                    <div className="slide-info">
                                        <h3>Simplicité</h3>
                                        <p>Concevez une maquette détaillée de manière intuitive</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_2.jpg" alt="Automatisation" />
                                    <div className="slide-info">
                                        <h3>Automatisation</h3>
                                        <p> Générez automatiquement vos devis et factures à partir de votre maquette</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_4.png" alt="Professionnalisme" />
                                    <div className="slide-info">
                                        <h3>Professionnalisme</h3>
                                        <p>Renforcez l'image de votre entreprise par une présentation claire de la prestation final</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_3.png" alt="Gain_Temps" />
                                    <div className="slide-info">
                                        <h3>Gain de temps</h3>
                                        <p>Répondez presque instantanément aux demandes de devis ou factures</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_1.png" alt="Simplicité" />
                                    <div className="slide-info">
                                        <h3>Simplicité</h3>
                                        <p>Concevez une maquette détaillée de manière intuitive</p>
                                    </div>
                                </div>
                            </div>
                            <div className="showcase-slide">
                                <div className="slide-content">
                                    <img src="/assets/Image_4K_2.jpg" alt="Automatisation" />
                                    <div className="slide-info">
                                        <h3>Automatisation</h3>
                                        <p> Générez automatiquement vos devis et factures à partir de votre maquette</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <br></br><br></br><br></br>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <img src="/assets/logo.svg" alt="BatiDevis Logo" className="footer-logo" />
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

export default Home; 
