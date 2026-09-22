import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../infrastructure/cloud/supabaseClient';
import { PlatformAdmin } from '../types/PlatformTypes';
import { platformAdminService } from '../services/PlatformAdminService';

interface PlatformAuthContextType {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshAdmin = useCallback(async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const currentAdmin = await platformAdminService.getCurrentAdmin();
      if (currentAdmin) {
        setAdmin(currentAdmin);
      } else {
        setAdmin(null);
      }
    } catch (err) {
      console.error('[PlatformAuthProvider] Error refreshing admin:', err);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    platformAdminService.getCurrentAdmin().then((currentAdmin) => {
      if (isMounted) {
        setAdmin(currentAdmin);
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('[PlatformAuthProvider] Error initializing admin:', err);
      if (isMounted) {
        setAdmin(null);
        setIsLoading(false);
      }
    });

    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshAdmin();
      } else if (event === 'SIGNED_OUT') {
        setAdmin(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAdmin]);

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: 'Correo o contraseña incorrectos.' };
      }

      if (!data.user) {
        setAuthError('Error de autenticación.');
        return { success: false, error: 'No se pudo iniciar sesión.' };
      }

      // Authorize strictly against platform_admins table
      const currentAdmin = await platformAdminService.getCurrentAdmin();
      if (!currentAdmin) {
        await supabase.auth.signOut();
        setAdmin(null);
        const deniedMsg = 'No tienes acceso a SevenPOS Platform.';
        setAuthError(deniedMsg);
        return { success: false, error: deniedMsg };
      }

      setAdmin(currentAdmin);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ingresar a Platform.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setAdmin(null);
    } catch (err) {
      console.error('Error signing out of Platform:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PlatformAuthContext.Provider
      value={{
        admin,
        isLoading,
        authError,
        signIn,
        signOut,
        refreshAdmin,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = (): PlatformAuthContextType => {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  }
  return context;
};
