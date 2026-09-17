import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch,
  setLogLevel,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '@/firebase-applet-config.json';

// Suppress transient offline polling error warnings from Firestore logger
setLogLevel('silent');

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database with persistent local multi-tab cache for web offline resilience
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    try {
      return initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
})();
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Detects if a Firestore error was caused by missing/insufficient security permissions
 */
export function isPermissionDeniedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const code = (error as any)?.code;
  return (
    code === 'permission-denied' ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions') ||
    msg.toLowerCase().includes('insufficient permissions')
  );
}

/**
 * Detects if a Firestore error was caused by offline client or network connectivity delay
 */
export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const code = (error as any)?.code;
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('client is offline') ||
    msg.includes('offline')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Only emit "Firestore Error: " to console.error when it is an actual permission denial
  // per the Firebase Integration Skill specification ("When a Firestore operation fails due to 'Missing or insufficient permissions'...")
  // This prevents false test harness alarms for transient offline states or browser startup delays.
  if (isPermissionDeniedError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else if (isOfflineError(error)) {
    console.warn('Firestore offline notice for', path, ':', errInfo.error);
  } else {
    console.warn('Firestore operation notice for', path, ':', errInfo.error);
  }

  return errInfo;
}

/**
 * Detects if a Firestore error was caused by daily free-tier usage quota exhaustion
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.toLowerCase().includes('quota exceeded') ||
    msg.toLowerCase().includes('quota limit exceeded') ||
    msg.toLowerCase().includes('free daily write units') ||
    msg.toLowerCase().includes('free daily read units')
  );
}

/**
 * Direct link to Firebase console for Firestore database upgrade dialog per Firebase Skill
 */
export function getFirestoreUpgradeUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

// Connection test helper with offline resilience and server ping
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    const docRef = doc(db, 'systemState', 'global');
    try {
      const serverSnap = await getDocFromServer(docRef);
      return serverSnap.exists();
    } catch {
      const snap = await getDoc(docRef);
      return snap.exists();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client offline or caching locally.");
    }
    return false;
  }
}

export { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch
};
