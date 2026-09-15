import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin_empresa" | "motorista" | "proprietario";

interface Profile {
  id: string;
  user_id: string;
  tenant_id: string | null;
  email: string;
  telefone: string | null;
  nome_completo: string | null;
  foto_perfil_url: string | null;
  status_cadastro: string;
  ativo: boolean;
  aprovado: boolean | null;
  data_aprovacao: string | null;
  aprovado_por: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  loading: boolean;
  needsRoleSelection: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  selectRole: (role: AppRole) => void;
  hasRole: (role: AppRole) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMotorista: boolean;
  isProprietario: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_ROLE_KEY = "tvde_pro_active_role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  // Track which userId we've already fetched, and whether a fetch is in-flight.
  // Using refs (not state) so they don't trigger re-renders and survive between
  // auth events without being captured stale in the listener closure.
  const fetchedUserIdRef = useRef<string | null>(null);
  const inflightUserIdRef = useRef<string | null>(null);

  const fetchUserDataOnce = (userId: string) => {
    // Deduplicate: skip if we've already fetched (or are fetching) this userId.
    if (fetchedUserIdRef.current === userId) return;
    if (inflightUserIdRef.current === userId) return;
    inflightUserIdRef.current = userId;
    return fetchUserData(userId).finally(() => {
      if (inflightUserIdRef.current === userId) {
        inflightUserIdRef.current = null;
      }
      fetchedUserIdRef.current = userId;
    });
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        const nextUserId = session?.user?.id ?? null;

        if (!nextUserId) {
          // Signed out: clear everything and stop loading.
          fetchedUserIdRef.current = null;
          inflightUserIdRef.current = null;
          setProfile(null);
          setRoles([]);
          setActiveRole(null);
          setNeedsRoleSelection(false);
          setLoading(false);
          localStorage.removeItem(ACTIVE_ROLE_KEY);
          return;
        }

        // Only fetch profile/roles the first time we see this userId.
        // Ignore TOKEN_REFRESHED / USER_UPDATED / repeated INITIAL_SESSION
        // which would otherwise re-trigger network calls and a loader flash.
        if (fetchedUserIdRef.current !== nextUserId && inflightUserIdRef.current !== nextUserId) {
          setLoading(true);
          // Defer to next tick to avoid running inside the auth callback
          setTimeout(() => fetchUserDataOnce(nextUserId), 0);
        }
      }
    );

    // THEN check for existing session (covers the case where onAuthStateChange
    // doesn't fire INITIAL_SESSION quickly enough on first load).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (fetchedUserIdRef.current !== session.user.id && inflightUserIdRef.current !== session.user.id) {
          setLoading(true);
          fetchUserDataOnce(session.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        setLoading(false);
        return;
      }

      const userRoles = (rolesData || []).map((r) => r.role as AppRole);
      setRoles(userRoles);

      // Check for stored active role
      const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
      
      if (userRoles.length === 0) {
        // No roles assigned
        setActiveRole(null);
        setNeedsRoleSelection(false);
      } else if (userRoles.length === 1) {
        // Only one role, auto-select it
        setActiveRole(userRoles[0]);
        setNeedsRoleSelection(false);
        localStorage.setItem(ACTIVE_ROLE_KEY, userRoles[0]);
      } else if (storedRole && userRoles.includes(storedRole)) {
        // User has stored role that's still valid
        setActiveRole(storedRole);
        setNeedsRoleSelection(false);
      } else {
        // Multiple roles, needs selection
        setActiveRole(null);
        setNeedsRoleSelection(true);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRole(role);
      setNeedsRoleSelection(false);
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Clear any stored role and refetch markers before new login
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setActiveRole(null);
    fetchedUserIdRef.current = null;
    inflightUserIdRef.current = null;

    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome_completo: nome,
        },
      },
    });

    if (!error && data.user) {
      // Update profile with name
      await supabase
        .from("profiles")
        .update({ nome_completo: nome })
        .eq("user_id", data.user.id);
    }

    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    fetchedUserIdRef.current = null;
    inflightUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setActiveRole(null);
    setNeedsRoleSelection(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  // Check based on active role, not all roles
  const isSuperAdmin = activeRole === "super_admin";
  const isAdmin = activeRole === "admin_empresa" || isSuperAdmin;
  const isMotorista = activeRole === "motorista";
  const isProprietario = activeRole === "proprietario";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        activeRole,
        loading,
        needsRoleSelection,
        signIn,
        signUp,
        signOut,
        selectRole,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isMotorista,
        isProprietario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
