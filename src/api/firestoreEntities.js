/**
 * Firestore entity CRUD — mirrors the shape of the old backend entity API.
 * All documents live under  users/{uid}/{EntityName}/{docId}
 * so each user has their own private subcollection.
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  orderBy,
  limit,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return auth.currentUser?.uid;
}

function userCol(entityName) {
  const u = uid();
  if (!u) throw new Error('Not authenticated');
  return collection(db, 'users', u, entityName);
}

/** Convert a Firestore doc snapshot to a plain object with id + ISO date strings. */
function toEntity(snap) {
  const data = snap.data();
  const convert = (v) => {
    if (v instanceof Timestamp) return v.toDate().toISOString();
    return v;
  };
  const out = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = convert(v);
  }
  return out;
}

/** Parse a sort string like "-updated_date" → { field, dir } */
function parseSort(sort) {
  if (!sort) return { field: 'updated_date', dir: 'desc' };
  const desc = sort.startsWith('-');
  return { field: desc ? sort.slice(1) : sort, dir: desc ? 'desc' : 'asc' };
}

// ── Entity client factory ─────────────────────────────────────────────────────

function makeFirestoreClient(entityName) {
  return {
    list: async (sort = '-updated_date', lim = 50) => {
      const { field, dir } = parseSort(sort);
      const col = userCol(entityName);
      const q = query(col, orderBy(field, dir), limit(lim));
      const snap = await getDocs(q);
      return snap.docs.map(toEntity);
    },

    filter: async (filters = {}, sort = '-updated_date', lim = 50) => {
      const { field, dir } = parseSort(sort);
      const col = userCol(entityName);
      const constraints = [orderBy(field, dir), limit(lim)];
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null) {
          constraints.push(where(k, '==', v));
        }
      }
      const q = query(col, ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(toEntity);
    },

    get: async (id) => {
      const ref = doc(userCol(entityName), id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error(`${entityName} ${id} not found`);
      return toEntity(snap);
    },

    create: async (data) => {
      const col = userCol(entityName);
      const now = serverTimestamp();
      const docRef = await addDoc(col, {
        ...data,
        created_by:   uid(),
        created_date: now,
        updated_date: now,
      });
      // Return what we just wrote (serverTimestamp resolves async, use approx)
      const isoNow = new Date().toISOString();
      return {
        id: docRef.id,
        ...data,
        created_by:   uid(),
        created_date: isoNow,
        updated_date: isoNow,
      };
    },

    update: async (id, data) => {
      const ref = doc(userCol(entityName), id);
      const now = serverTimestamp();
      await setDoc(ref, { ...data, updated_date: now }, { merge: true });
      const isoNow = new Date().toISOString();
      return { id, ...data, updated_date: isoNow };
    },

    delete: async (id) => {
      const ref = doc(userCol(entityName), id);
      await deleteDoc(ref);
      return null;
    },
  };
}

export const firestoreEntities = {
  ResearchProject: makeFirestoreClient('ResearchProject'),
  Document:        makeFirestoreClient('Document'),
  Conversation:    makeFirestoreClient('Conversation'),
  ResearchGap:     makeFirestoreClient('ResearchGap'),
  Citation:        makeFirestoreClient('Citation'),
};
