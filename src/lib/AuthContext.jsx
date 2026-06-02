import { createContext, useState, useContext, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cogniflow_token';
const getBackendToken  = ()     => localStorage.getItem(TOKEN_KEY);
const setBackendToken  = (tok)  => localStorage.setItem(TOKEN_KEY, tok);
const clearBackendToken = ()    => localStorage.removeItem(TOKEN_KEY);

/**
 * Exchange a Firebase ID token for a CogniFlow backend JWT.
 * The backend creates or fetches the user record and returns its own JWT,
 * which we use for all AI-feature API calls.
 */
async function exchangeForBackendJwt(firebaseUser) {
  try {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token:  idToken,
        email:     firebaseUser.email,
        full_name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        uid:       firebaseUser.uid,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) setBackendToken(data.access_token);
    }
  } catch {
    // Backend unavailable — AI features won't work, but Firestore features will
  }
}

export const AuthProvider = ({ children }) => {
  const [user,              setUser]              = useState(null);
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
  const [isLoadingAuth,     setIsLoadingAuth]     = useState(true);
  const [authError,         setAuthError]         = useState(null);
  const [isLoadingPublicSettings] = useState(false);
  const [appPublicSettings] = useState({
    id: 'cogniflow',
    public_settings: { auth_required: true, allow_guest: false },
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userObj = {
          id:        firebaseUser.uid,
          uid:       firebaseUser.uid,
          email:     firebaseUser.email,
          full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Researcher',
        };
        setUser(userObj);
        setIsAuthenticated(true);
        setAuthError(null);
        await exchangeForBackendJwt(firebaseUser);
      } else {
        clearBackendToken();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      }
      setIsLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  const login = async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const register = async ({ email, password, full_name }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (full_name) {
      await updateProfile(cred.user, { displayName: full_name });
    }
    return cred.user;
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  };

  const logout = async () => {
    clearBackendToken();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    await signOut(auth);
  };

  const navigateToLogin = () => setAuthError({ type: 'auth_required' });

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        login,
        register,
        loginWithGoogle,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
