// Configuration des variables d'environnement
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const YOUSIGN_API_KEY = import.meta.env.VITE_APP_YOUSIGN_API_KEY;

export const config = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  
  // Autres configurations
  app: {
    name: 'BatiDevis',
    version: '1.0.0',
  },
  
  // URLs de redirection
  auth: {
    redirectUrl: `${window.location.origin}/auth/callback`,
  },
};

// Validation des variables d'environnement requises
export const validateEnv = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('Variables d\'environnement manquantes:', missingVars);
    console.error('Veuillez créer un fichier .env avec les variables suivantes:');
    missingVars.forEach((varName) => {
      console.error(`- ${varName}`);
    });
    return false;
  }

  return true;
}; 