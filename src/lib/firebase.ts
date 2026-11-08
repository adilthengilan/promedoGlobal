import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

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

// Use initializeFirestore with experimentalForceLongPolling and shorter timeout to avoid connection aborts behind proxies
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 12,
    },
  });
} catch {
  firestoreInstance = getFirestore(app);
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

  // Suppress harmless transient aborts from Firestore transport cancellation / reconnection
  if (
    errName === 'AbortError' ||
    errMsg.includes('signal is aborted') ||
    errMsg.includes('AbortError')
  ) {
    console.warn(`[Firestore] Transport abort ignored for ${operationType} on ${path}:`, errMsg);
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
