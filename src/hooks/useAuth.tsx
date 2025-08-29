import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';
import { AuthUser, SignUpData, SignInData } from '../config/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  signIn: (data: SignInData) => Promise<{ success: boolean; error?: string }>;
  signInWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;

  signOut: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'utilisateur actuel au chargement
    const checkUser = async () => {
      try {
        const { user: currentUser } = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignUpData): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
    try {
      const { user: newUser, error } = await AuthService.signUp(data);
      if (error) {
        return { success: false, error };
      }
      if (newUser) {
        setUser(newUser);
        return { success: true, user: newUser };
      }
      return { success: false, error: 'Aucun utilisateur retourné' };
    } catch (error) {
      return { success: false, error: 'Erreur lors de l\'inscription' };
    }
  };

  const signIn = async (data: SignInData): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('useAuth signIn appelé avec:', data);
      const { user: authUser, error } = await AuthService.signIn(data);
      console.log('useAuth signIn résultat:', { authUser, error });
      
      if (error) {
        console.error('useAuth signIn erreur:', error);
        return { success: false, error };
      }
      
      if (authUser) {
        console.log('useAuth signIn utilisateur défini:', authUser);
        setUser(authUser);
        return { success: true };
      } else {
        console.error('useAuth signIn aucun utilisateur retourné');
        return { success: false, error: 'Aucun utilisateur retourné' };
      }
    } catch (error) {
      console.error('useAuth signIn catch:', error);
      return { success: false, error: 'Erreur lors de la connexion' };
    }
  };

  const signInWithToken = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user: authUser, error } = await AuthService.signInWithToken(token);
      if (error) {
        return { success: false, error };
      }
      setUser(authUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la connexion avec le token' };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.signInWithGoogle();
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la connexion avec Google' };
    }
  };

  const signInWithLinkedIn = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.signInWithLinkedIn();
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la connexion avec LinkedIn' };
    }
  };

  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.signOut();
      if (error) {
        return { success: false, error };
      }
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la déconnexion' };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithToken,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
