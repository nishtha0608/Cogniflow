/**
 * CogniFlow API adapter.
 *
 * Auth + Entities  → Firebase Auth + Firestore (client-side SDK)
 * AI Features      → FastAPI backend at /api  (proxied to localhost:8000 by Vite)
 *                    Auth header: backend JWT obtained after Firebase sign-in
 */
import { firestoreEntities } from './firestoreEntities';
import { auth as firebaseAuth, googleProvider } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

// ── Backend JWT (for AI features only) ───────────────────────────────────────

const API_BASE  = '/api';
const TOKEN_KEY = 'cogniflow_token';

const getToken   = ()    => localStorage.getItem(TOKEN_KEY);
const setToken   = (tok) => localStorage.setItem(TOKEN_KEY, tok);
const clearToken = ()    => localStorage.removeItem(TOKEN_KEY);

// ── Backend fetch wrapper ─────────────────────────────────────────────────────

const apiFetch = async (url, options = {}) => {
  const token   = getToken();
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + url, { ...options, headers });

  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch {}
    const err    = new Error(errData.detail || `HTTP ${res.status}`);
    err.status   = res.status;
    err.data     = errData;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
};

// ── Auth (Firebase) ───────────────────────────────────────────────────────────

const auth = {
  me: async () => {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    return {
      id:        fbUser.uid,
      uid:       fbUser.uid,
      email:     fbUser.email,
      full_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Researcher',
    };
  },

  login: async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return cred.user;
  },

  loginWithGoogle: async () => {
    const cred = await signInWithPopup(firebaseAuth, googleProvider);
    return cred.user;
  },

  register: async ({ email, password, full_name }) => {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (full_name) await updateProfile(cred.user, { displayName: full_name });
    return cred.user;
  },

  logout: async () => {
    clearToken();
    await signOut(firebaseAuth);
  },

  redirectToLogin: () => window.location.reload(),
};

// ── Entities (Firestore) ──────────────────────────────────────────────────────

const entities = firestoreEntities;

// ── Integrations (backend) ────────────────────────────────────────────────────

const integrations = {
  Core: {
    InvokeLLM: async (body) => {
      const res = await apiFetch('/integrations/Core/InvokeLLM', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res?.output ?? res;
    },

    UploadFile: async ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const token   = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(API_BASE + '/integrations/Core/UploadFile', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }
      return res.json();
    },

    ExtractDataFromUploadedFile: async (body) => {
      return apiFetch('/integrations/Core/ExtractDataFromUploadedFile', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
};

// ── AI Features (backend) ─────────────────────────────────────────────────────

const ai = {
  council:         (body) => apiFetch('/ai/council',          { method: 'POST', body: JSON.stringify(body) }),
  serendipity:     (body) => apiFetch('/ai/serendipity',      { method: 'POST', body: JSON.stringify(body) }),
  momentum:        ()     => apiFetch('/ai/momentum'),
  narrative:       (body) => apiFetch('/ai/narrative',        { method: 'POST', body: JSON.stringify(body) }),
  graphData:       ()     => apiFetch('/ai/graph-data'),
  autopilot:       (body) => apiFetch('/ai/autopilot',        { method: 'POST', body: JSON.stringify(body) }),
  debate:          (body) => apiFetch('/ai/debate',           { method: 'POST', body: JSON.stringify(body) }),
  genome:          ()     => apiFetch('/ai/genome'),
  breakthrough:    (body) => apiFetch('/ai/breakthrough',     { method: 'POST', body: JSON.stringify(body) }),
  projectInsights: (body) => apiFetch('/ai/project-insights', { method: 'POST', body: JSON.stringify(body) }),

  chat:        (body) => apiFetch('/ai/chat',          { method: 'POST', body: JSON.stringify(body) }),
  gapAnalysis: (body) => apiFetch('/ai/gap-analysis',  { method: 'POST', body: JSON.stringify(body) }),

  viva: {
    question: (body) => apiFetch('/ai/viva/question', { method: 'POST', body: JSON.stringify(body) }),
    evaluate: (body) => apiFetch('/ai/viva/evaluate', { method: 'POST', body: JSON.stringify(body) }),
  },

  documents: {
    ingest: (body)  => apiFetch('/ai/documents/ingest',    { method: 'POST', body: JSON.stringify(body) }),
    delete: (docId) => apiFetch(`/ai/documents/${docId}`,  { method: 'DELETE' }),
  },

  writing: {
    humanize:    (body) => apiFetch('/ai/writing/humanize',    { method: 'POST', body: JSON.stringify(body) }),
    plagiarism:  (body) => apiFetch('/ai/writing/plagiarism',  { method: 'POST', body: JSON.stringify(body) }),
    improve:     (body) => apiFetch('/ai/writing/improve',     { method: 'POST', body: JSON.stringify(body) }),
    stats:       (body) => apiFetch('/ai/writing/stats',       { method: 'POST', body: JSON.stringify(body) }),
  },
};

// ── App Logs (stub) ───────────────────────────────────────────────────────────

const appLogs = {
  logUserInApp: async (_pageName) => {},
};

// ── Exported client ────────────────────────────────────────────────────────────

export const cogniflow = { auth, entities, integrations, appLogs, ai };
