import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setError('Erreur lors de l\'authentification');
          console.error('Auth error:', error);
        } else if (data.session) {
          // Connexion réussie
          navigate('/', { replace: true });
        } else {
          // Pas de session, rediriger vers la page de connexion
          navigate('/connexion', { replace: true });
        }
      } catch (err) {
        setError('Erreur inattendue');
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="auth-callback-container">
        <div className="loading-spinner"></div>
        <p>Authentification en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-callback-container">
        <div className="error-message">
          <h2>Erreur d'authentification</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/connexion')}>
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
