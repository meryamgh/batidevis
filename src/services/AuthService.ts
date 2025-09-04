import { supabase, SignUpData, SignInData, AuthUser } from '../config/supabase';
import { config } from '../config/env';

export class AuthService {
  // Inscription d'un nouvel utilisateur
  static async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      
      
      try {
        const response = await fetch(`${config.supabase.url}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey!,
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            data: {
              first_name: data.first_name,
              last_name: data.last_name,
              company_name: data.company_name,
            }
          }),
        });
        
        const responseData = await response.json(); 
        
        if (response.ok && responseData.user) {
         
          // Créer un cookie de session avec les vraies données
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);
          
          document.cookie = `supabase_session=${JSON.stringify({
            user: {
              id: responseData.user.id,
              email: responseData.user.email,
              first_name: data.first_name,
              last_name: data.last_name,
              company_name: data.company_name,
              created_at: responseData.user.created_at
            },
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token,
            expires_at: responseData.expires_at
          })}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
          
          
          return {
            user: {
              id: responseData.user.id,
              email: responseData.user.email,
              first_name: data.first_name,
              last_name: data.last_name,
              company_name: data.company_name,
              created_at: responseData.user.created_at
            },
            error: null
          };
        } else {
          console.error('AuthService.signUp - Erreur API REST:', responseData);
          
          // Gérer les erreurs spécifiques
          if (responseData.msg?.includes('user_already_exists') || responseData.error_description?.includes('user_already_exists')) {
            return { user: null, error: 'Un utilisateur avec cet email existe déjà' };
          }
          
          if (responseData.msg?.includes('Database error saving new user')) {
            console.error('AuthService.signUp - Erreur de base de données détaillée:', responseData);
            return { user: null, error: 'Erreur de configuration de la base de données. Veuillez contacter l\'administrateur.' };
          }
          
          return { user: null, error: responseData.msg || responseData.error_description || 'Erreur lors de l\'inscription' };
        }
      } catch (apiError) {
        console.error('AuthService.signUp - Erreur API REST:', apiError);
        
      
        
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.first_name,
              last_name: data.last_name,
              company_name: data.company_name,
            }
          }
        });

        console.log('AuthService.signUp - Réponse Supabase:', { authData, error });

        if (error) {
          console.error('AuthService.signUp - Erreur Supabase:', error);
          
          if (error.message?.includes('user_already_exists')) {
            return { user: null, error: 'Un utilisateur avec cet email existe déjà' };
          }
          
          if (error.message?.includes('Database error saving new user')) {
            console.error('AuthService.signUp - Erreur de base de données détaillée:', error);
            return { user: null, error: 'Erreur de configuration de la base de données. Veuillez contacter l\'administrateur.' };
          }
          
          return { user: null, error: error.message };
        }

        if (authData.user) {
          
          return {
            user: {
              id: authData.user.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
              company_name: data.company_name,
              created_at: authData.user.created_at
            },
            error: null
          };
        }

        return { user: null, error: 'Erreur lors de l\'inscription' };
      }
    } catch (error) {
      console.error('AuthService.signUp - Erreur catch:', error);
      return { user: null, error: 'Erreur serveur' };
    }
  }

  // Connexion d'un utilisateur
  static async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      
      
      try {
        const response = await fetch(`${config.supabase.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey!,
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        });
        
        const responseData = await response.json();
       
        if (response.ok && responseData.user) {
          // Récupérer les données du profil depuis la base de données
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', responseData.user.id)
            .single();

           console.log('AuthService.signIn - Erreur profil:', profileError);

          const userData = {
            id: responseData.user.id,
            email: responseData.user.email || '',
            first_name: profile?.first_name || responseData.user.user_metadata?.first_name || '',
            last_name: profile?.last_name || responseData.user.user_metadata?.last_name || '',
            company_name: profile?.company_name || responseData.user.user_metadata?.company_name || '',
            created_at: responseData.user.created_at
          };
          
          // Créer un cookie de session qui dure 1 mois
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);
          
          // Stocker les données de session dans un cookie sécurisé
          document.cookie = `supabase_session=${JSON.stringify({
            user: userData,
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token,
            expires_at: responseData.expires_at
          })}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
          
         
          return { user: userData, error: null };
        } else {
          console.error('AuthService.signIn - Erreur API REST:', responseData);
          return { user: null, error: responseData.error_description || 'Erreur lors de la connexion' };
        }
      } catch (apiError) {
        console.error('AuthService.signIn - Erreur API REST:', apiError);
        return { user: null, error: 'Erreur lors de la connexion' };
      }
     } catch (error) {
       console.error('AuthService.signIn - Erreur catch:', error);
       return { user: null, error: 'Erreur serveur' };
     }
  }

  

  // Déconnexion
  static async signOut(): Promise<{ error: string | null }> {
    try {
      // Supprimer le cookie de session
      document.cookie = 'supabase_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      return { error: null };
    } catch (error) {
      console.error('Erreur signOut:', error);
      return { error: 'Erreur lors de la déconnexion' };
    }
  }

  // Récupérer l'utilisateur actuel depuis le cookie
  static async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Récupérer la session depuis le cookie
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('supabase_session='));
      
      if (!sessionCookie) { 
        return { user: null, error: null };
      }
      
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
     
      // Vérifier si le token n'est pas expiré
      if (sessionData.expires_at && sessionData.expires_at * 1000 < Date.now()) { 
        document.cookie = 'supabase_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        return { user: null, error: null };
      }

      // Si les données du profil sont manquantes, les récupérer depuis la base de données
      if (!sessionData.user.first_name && !sessionData.user.last_name) {
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.user.id)
          .single();

        if (profile && !profileError) {
          const updatedUser = {
            ...sessionData.user,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            company_name: profile.company_name || ''
          };

          // Mettre à jour le cookie avec les nouvelles données
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 1);
          
          document.cookie = `supabase_session=${JSON.stringify({
            ...sessionData,
            user: updatedUser
          })}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;

          return { user: updatedUser, error: null };
        }
      }
      
      return { user: sessionData.user, error: null };
    } catch (error) {
      console.error('Erreur getCurrentUser catch:', error);
      return { user: null, error: 'Erreur serveur' };
    }
  }

  // Mettre à jour le profil utilisateur
  static async updateProfile(userId: string, profileData: Partial<AuthUser>): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
     
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('supabase_session='));
      
      if (!sessionCookie) {
        return { user: null, error: 'Session non trouvée' };
      }

      const sessionData = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));

      // Récupérer l'email de l'utilisateur actuel
      const currentUser = sessionData.user;
      
      // Mettre à jour la base de données Supabase
      const { data: updatedProfile, error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: currentUser.email, // Inclure l'email actuel
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          company_name: profileData.company_name,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('AuthService.updateProfile - Erreur DB:', dbError);
        return { user: null, error: 'Erreur lors de la mise à jour en base de données' };
      }
 
      // Mettre à jour les données utilisateur dans la session
      const updatedUser = {
        ...sessionData.user,
        first_name: updatedProfile.first_name || '',
        last_name: updatedProfile.last_name || '',
        company_name: updatedProfile.company_name || ''
      };

      // Mettre à jour le cookie de session
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      
      document.cookie = `supabase_session=${JSON.stringify({
        ...sessionData,
        user: updatedUser
      })}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
 
      return { user: updatedUser, error: null };
    } catch (error) {
      console.error('AuthService.updateProfile - Erreur:', error);
      return { user: null, error: 'Erreur lors de la mise à jour du profil' };
    }
  }

  // Écouter les changements d'authentification
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        callback({
          id: session.user.id,
          email: session.user.email || '',
          last_name: profile?.last_name,
          first_name: profile?.first_name,
          company_name: profile?.company_name,
          created_at: session.user.created_at
        });
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  }
}
