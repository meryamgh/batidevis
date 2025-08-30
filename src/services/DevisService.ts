import { supabase } from '../config/supabase';

// Interface pour les lignes de devis
export interface DevisLine {
  details: string;
  price: number;
  quantity: number;
  unit?: string;
}

// Interface pour les informations du devis
export interface DevisInfo {
  // Informations BatiDevis
  devoTitle: string;
  devoName: string;
  devoAddress: string;
  devoCity: string;
  devoSiren: string;
  
  // Informations client
  societeBatiment: string;
  clientAdresse: string;
  clientCodePostal: string;
  clientTel: string;
  clientEmail: string;
  
  // Informations de devis
  devisNumero: string;
  enDateDu: string;
  valableJusquau: string;
  debutTravaux: string;
  dureeTravaux: string;
  
  // Informations complémentaires
  fraisDeplacement: string;
  tauxHoraire: string;
  isDevisGratuit: boolean;
  
  // Logo (URL ou base64)
  logo?: string;
}

// Interface pour les totaux
export interface DevisTotals {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  acompte: number;
  resteAPayer: number;
  tvaRate: number;
  acompteRate: number;
}

// Interface complète pour un devis
export interface Devis {
  id?: string;
  user_id?: string;
  name: string;
  description?: string;
  data: {
    info: DevisInfo;
    lines: DevisLine[];
    totals: DevisTotals;
  };
  status: 'brouillon' | 'envoyé' | 'accepté' | 'annulé' | 'signé';
  maquette_id?: string; // Référence vers la maquette associée
  signature_request_id?: string;
  signature_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DevisData {
  info: DevisInfo;
  lines: DevisLine[];
  totals: DevisTotals;
}

export class DevisService {
  // Méthode de débogage pour vérifier l'état de l'authentification
  static async debugAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 Debug Auth Devis:', {
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? { access_token: session.access_token ? 'Present' : 'Missing' } : null,
        isAuthenticated: !!user
      });
      
      return { user, session };
    } catch (error) {
      console.error('❌ Erreur lors du debug auth devis:', error);
      throw error;
    }
  }

  // Sauvegarder un nouveau devis
  static async saveDevis(name: string, data: DevisData, description?: string, userId?: string): Promise<Devis> {
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
      const { data: devis, error } = await supabase
        .from('devis')
        .insert({
          user_id: user_id,
          name,
          description,
          data,
          status: 'brouillon'
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur avec l\'API Supabase standard:', error);
        // Si ça échoue, essayer avec l'API REST directe
        console.log('Tentative avec l\'API REST directe...');
        return await this.saveDevisViaREST(name, data, description, user_id);
      }

      return devis;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du devis:', error);
      throw error;
    }
  }

  // Méthode alternative utilisant l'API REST directe
  private static async saveDevisViaREST(name: string, data: DevisData, description?: string, userId?: string): Promise<Devis> {
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
      
      const response = await fetch(`${supabaseUrl}/rest/v1/devis`, {
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
          data,
          status: 'brouillon'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const devis = await response.json();
      return Array.isArray(devis) ? devis[0] : devis;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde via REST:', error);
      throw error;
    }
  }

  // Mettre à jour un devis existant
  static async updateDevis(id: string, name: string, data: DevisData, description?: string, status?: string): Promise<Devis> {
    try {
      const updateData: any = {
        name,
        description,
        data,
        updated_at: new Date().toISOString()
      };

      if (status) {
        updateData.status = status;
      }

      const { data: devis, error } = await supabase
        .from('devis')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour du devis:', error);
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
      }

      return devis;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du devis:', error);
      throw error;
    }
  }

  // Mettre à jour le statut d'un devis
  static async updateDevisStatus(id: string, status: string, signatureRequestId?: string, signatureUrl?: string): Promise<Devis> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (signatureRequestId) {
        updateData.signature_request_id = signatureRequestId;
      }

      if (signatureUrl) {
        updateData.signature_url = signatureUrl;
      }

      const { data: devis, error } = await supabase
        .from('devis')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
      }

      return devis;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  // Récupérer tous les devis de l'utilisateur connecté
  static async getUserDevis(): Promise<Devis[]> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des devis:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return devis || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
      throw error;
    }
  }

  // Récupérer un devis par son ID
  static async getDevisById(id: string): Promise<Devis> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du devis:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return devis;
    } catch (error) {
      console.error('Erreur lors de la récupération du devis:', error);
      throw error;
    }
  }

  // Supprimer un devis
  static async deleteDevis(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('devis')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression du devis:', error);
        throw new Error(`Erreur lors de la suppression: ${error.message}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du devis:', error);
      throw error;
    }
  }

  // Récupérer le dernier devis de l'utilisateur
  static async getLastDevis(): Promise<Devis | null> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur lors de la récupération du dernier devis:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      return devis || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du dernier devis:', error);
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
  static async saveDevisWithUserId(name: string, data: DevisData, userId: string, description?: string): Promise<Devis> {
    try {
      console.log('🔄 Sauvegarde devis avec userId:', userId);
      
      // Utiliser directement la méthode de sauvegarde avec l'ID utilisateur
      return await this.saveDevis(name, data, description, userId);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde devis avec userId:', error);
      throw error;
    }
  }

  // Sauvegarder un devis avec sa maquette associée
  static async saveDevisWithMaquette(
    name: string, 
    devisData: DevisData, 
    maquetteData: any, // MaquetteData du MaquetteService
    description?: string, 
    userId?: string
  ): Promise<{ devis: Devis; maquette: any }> {
    try {
      console.log('🔄 Sauvegarde devis avec maquette associée');
      
      let user_id = userId;
      
      // Si userId n'est pas fourni, essayer de le récupérer via Supabase
      if (!user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Aucun utilisateur connecté');
        }
        user_id = user.id;
      }

      // 1. D'abord sauvegarder la maquette
      const { MaquetteService } = await import('./MaquetteService');
      const maquette = await MaquetteService.saveMaquetteWithUserId(
        `${name} - Maquette`, 
        maquetteData, 
        user_id, 
        `Maquette associée au devis: ${name}`
      );

      // 2. Ensuite sauvegarder le devis avec la référence vers la maquette
      const { data: devis, error } = await supabase
        .from('devis')
        .insert({
          user_id: user_id,
          name,
          description,
          data: devisData,
          maquette_id: maquette.id,
          status: 'brouillon'
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la sauvegarde du devis avec maquette:', error);
        throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
      }

      return { devis, maquette };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde devis avec maquette:', error);
      throw error;
    }
  }

  // Récupérer un devis avec sa maquette associée
  static async getDevisWithMaquette(id: string): Promise<{ devis: Devis; maquette: any }> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du devis:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      // Si le devis a une maquette associée, la récupérer
      let maquette = null;
      if (devis.maquette_id) {
        const { MaquetteService } = await import('./MaquetteService');
        maquette = await MaquetteService.getMaquetteById(devis.maquette_id);
      }

      return { devis, maquette };
    } catch (error) {
      console.error('Erreur lors de la récupération du devis avec maquette:', error);
      throw error;
    }
  }

  // Récupérer tous les devis avec leurs maquettes associées
  static async getUserDevisWithMaquettes(): Promise<Array<{ devis: Devis; maquette: any }>> {
    try {
      const { data: devis, error } = await supabase
        .from('devis')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des devis:', error);
        throw new Error(`Erreur lors de la récupération: ${error.message}`);
      }

      // Récupérer les maquettes associées
      const { MaquetteService } = await import('./MaquetteService');
      const devisWithMaquettes = await Promise.all(
        (devis || []).map(async (devisItem) => {
          let maquette = null;
          if (devisItem.maquette_id) {
            try {
              maquette = await MaquetteService.getMaquetteById(devisItem.maquette_id);
            } catch (error) {
              console.warn(`Impossible de récupérer la maquette ${devisItem.maquette_id} pour le devis ${devisItem.id}:`, error);
            }
          }
          return { devis: devisItem, maquette };
        })
      );

      return devisWithMaquettes;
    } catch (error) {
      console.error('Erreur lors de la récupération des devis avec maquettes:', error);
      throw error;
    }
  }
}
