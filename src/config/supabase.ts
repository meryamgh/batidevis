import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, validateEnv } from './env';

// Singleton pour éviter les instances multiples
let supabaseInstance: SupabaseClient | null = null;

// Validation des variables d'environnement
if (!validateEnv()) {
  throw new Error('Configuration Supabase manquante. Vérifiez votre fichier .env');
}

// Créer une seule instance du client Supabase
if (!supabaseInstance) {  
  supabaseInstance = createClient(config.supabase.url!, config.supabase.anonKey!); 
}

export const supabase = supabaseInstance!;

// Types pour l'authentification
export interface AuthUser {
  id: string;
  email: string;
  last_name?: string;
  first_name?: string;
  company_name?: string;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  last_name: string;
  first_name: string;
  company_name: string;
}

export interface SignInData {
  email: string;
  password: string;
}
