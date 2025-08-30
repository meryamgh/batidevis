import { supabase } from '../config/supabase';

// Type pour les objets sauvegardés (sans gltf qui ne peut pas être sérialisé)
export interface SavedObjectData {
  id: string;
  url: string;
  price: number;
  details: string;
  position: [number, number, number];
  texture?: string;
  scale: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  startPoint?: [number, number];
  endPoint?: [number, number];
  parentScale?: [number, number, number];
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    center: [number, number, number];
  };
  faces?: any;
  type?: 'wall' | 'floor' | 'object' | 'ceiling';
  parametricData?: any;
  isBatiChiffrageObject: boolean;
}

export interface Maquette {
  id?: string;
  user_id?: string;
  name: string;
  description?: string;
  data: {
    objects: SavedObjectData[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface MaquetteData {
  objects: SavedObjectData[];
}

export class MaquetteService {
  // Méthode de débogage pour vérifier l'état de l'authentification
  static async debugAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 Debug Auth:', {
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? { access_token: session.access_token ? 'Present' : 'Missing' } : null,
        isAuthenticated: !!user
      });
      
      return { user, session };
    } catch (error) {
      console.error('❌ Erreur lors du debug auth:', error);
      throw error;
    }
  }

  // Obtenir les en-têtes d'autorisation
  private static async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  }

  // Sauvegarder une nouvelle maquette
  static async saveMaquette(name: string, data: MaquetteData, description?: string, userId?: string): Promise<Maquette> {
    try {
      let user_id = userId;
      
      // Si userId n'est pas fourni, essayer de le récupérer via Supabase
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Aucun utilisateur connecté');
        }
        user_id = user.id;
      }

      // Essayer d'abord avec l'API Supabase standard
      const { data: maquette, error } = await supabase
        .from('maquettes')
        .insert({
          user_id: user_id,
          name,
          description,
          data
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur avec l\'API Supabase standard:', error);
        // Si ça échoue, essayer avec l'API REST directe
        console.log('Tentative avec l\'API REST directe...');
        return await this.saveMaquetteViaREST(name, data, description, user_id);
      }

      return maquette;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la maquette:', error);
      throw error;
    }
  }

  // Méthode alternative utilisant l'API REST directe
  private static async saveMaquetteViaREST(name: string, data: MaquetteData, description?: string, userId?: string): Promise<Maquette> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Aucune session active');
      }

      let user_id = userId;
      
      // Si userId n'est pas fourni, essayer de le récupérer via Supabase
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Aucun utilisateur connecté');
        }
        user_id = user.id;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/maquettes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey || '',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: user_id,
          name,
          description,
          data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const maquette = await response.json();
      return Array.isArray(maquette) ? maquette[0] : maquette;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde via REST:', error);
      throw error;
    }
  }

  // Mettre à jour une maquette existante
  static async updateMaquette(id: string, name: string, data: MaquetteData, description?: string): Promise<Maquette> {
    try {
      const { data: maquette, error } = await supabase
        .from('maquettes')
        .update({
          name,
          description,
          data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour de la maquette:', error);
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
      }

      return maquette;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la maquette:', error);
      throw error;
    }
  }

  // Récupérer toutes les maquettes de l'utilisateur connecté
  static async getUserMaquettes(): Promise<Maquette[]> {
    try {
      const { data: maquettes, error } = await supabase
        .from('maquettes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des maquettes:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return maquettes || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des maquettes:', error);
      throw error;
    }
  }

  // Récupérer une maquette par son ID
  static async getMaquetteById(id: string): Promise<Maquette> {
    try {
      const { data: maquette, error } = await supabase
        .from('maquettes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de la maquette:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return maquette;
    } catch (error) {
      console.error('Erreur lors de la récupération de la maquette:', error);
      throw error;
    }
  }

  // Supprimer une maquette
  static async deleteMaquette(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maquettes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de la maquette:', error);
        throw new Error(`Erreur lors de la suppression: ${error.message}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la maquette:', error);
      throw error;
    }
  }

  // Récupérer la dernière maquette de l'utilisateur
  static async getLastMaquette(): Promise<Maquette | null> {
    try {
      const { data: maquette, error } = await supabase
        .from('maquettes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur lors de la récupération de la dernière maquette:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return maquette || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière maquette:', error);
      throw error;
    }
  }

  // Méthode pour forcer la synchronisation de la session
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Erreur lors du refresh de la session:', error);
        throw error;
      }
      console.log('✅ Session rafraîchie avec succès');
      return data;
    } catch (error) {
      console.error('❌ Erreur lors du refresh de la session:', error);
      throw error;
    }
  }

  // Méthode alternative de sauvegarde qui utilise directement l'ID utilisateur
  static async saveMaquetteWithUserId(name: string, data: MaquetteData, userId: string, description?: string): Promise<Maquette> {
    try {
      console.log('🔄 Sauvegarde avec userId:', userId);
      
      // Utiliser directement la méthode de sauvegarde avec l'ID utilisateur
      return await this.saveMaquette(name, data, description, userId);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde avec userId:', error);
      throw error;
    }
  }
}
