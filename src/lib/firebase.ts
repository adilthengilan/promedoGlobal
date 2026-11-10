import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, memoryLocalCache } from "firebase/firestore";

import rawFirebaseConfig from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || rawFirebaseConfig.measurementId
};

let app: any;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Create a dummy app object to prevent crashes
  app = { name: '[DEFAULT]' } as any;
}

export const auth = getAuth(app);

// Use in-memory cache to prevent IndexedDB leveldb storage exhaustion (FILE_ERROR_NO_SPACE)
// and force long polling with shorter timeout to avoid proxy drops
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 12,
    },
  });
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errName = error instanceof Error ? error.name : '';

  // Suppress harmless transient aborts and browser storage quota constraints
  if (
    errName === 'AbortError' ||
    errName === 'QuotaExceededError' ||
    errMsg.includes('signal is aborted') ||
    errMsg.includes('AbortError') ||
    errMsg.includes('FILE_ERROR_NO_SPACE') ||
    errMsg.includes('indexeddb') ||
    errMsg.includes('leveldb') ||
    errMsg.includes('IO error')
  ) {
    console.warn(`[Firestore] Transport abort or storage constraint ignored for ${operationType} on ${path}:`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
