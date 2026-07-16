// Firebase-compatible layer using localStorage for offline/open-source use
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from './localDb';

export { collection, doc, query, where, orderBy, addDoc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, serverTimestamp };

// Dummy db object (not used by localDb, but components reference it)
export const db = {} as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database error (${operationType} on ${path}):`, message);
  throw new Error(message);
}

// Stub auth functions (no-op for offline mode)
export const logout = async () => {};
export const getAccessToken = async (): Promise<string | null> => null;
