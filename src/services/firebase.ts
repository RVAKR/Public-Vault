import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  serverTimestamp, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StoredEncryptedVault } from '../types';

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase connectivity or offline status.");
    }
  }
}
testFirestoreConnection();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign In With Google Popup SSO
 */
export async function signInWithGoogleSSO(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user profile record
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      userId: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out of Firebase Auth
 */
export async function signOutSSO(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Save encrypted vault to Firestore under the authenticated user's account
 */
export async function saveVaultToFirestore(userId: string, vault: StoredEncryptedVault, itemCount: number): Promise<void> {
  const path = `users/${userId}/vault/current`;
  try {
    const vaultDocRef = doc(db, 'users', userId, 'vault', 'current');
    await setDoc(vaultDocRef, {
      userId,
      salt: vault.meta.salt,
      verifier: vault.meta.verifier,
      verifierIv: vault.meta.verifierIv,
      ciphertext: vault.ciphertext,
      iv: vault.iv,
      passwordHint: vault.meta.passwordHint || '',
      autoLockMinutes: vault.meta.autoLockMinutes || 5,
      itemCount,
      version: vault.meta.version || 1,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load encrypted vault from Firestore for the authenticated user
 */
export async function loadVaultFromFirestore(userId: string): Promise<StoredEncryptedVault | null> {
  const path = `users/${userId}/vault/current`;
  try {
    const vaultDocRef = doc(db, 'users', userId, 'vault', 'current');
    const snap = await getDoc(vaultDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      meta: {
        isConfigured: true,
        salt: data.salt,
        verifier: data.verifier,
        verifierIv: data.verifierIv,
        passwordHint: data.passwordHint,
        autoLockMinutes: data.autoLockMinutes || 5,
        lastActive: Date.now(),
        version: data.version || 1,
        updatedAt: new Date(data.updatedAt || Date.now()).getTime(),
      },
      ciphertext: data.ciphertext,
      iv: data.iv,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Record monthly archive audit log
 */
export async function logArchiveToFirestore(
  userId: string, 
  recipientEmail: string, 
  archiveName: string, 
  itemCount: number, 
  fileCount: number
): Promise<void> {
  const path = `users/${userId}/archives`;
  try {
    const archiveId = `archive_${Date.now()}`;
    const archiveDocRef = doc(db, 'users', userId, 'archives', archiveId);
    await setDoc(archiveDocRef, {
      userId,
      recipientEmail,
      archiveName,
      itemCount,
      fileCount,
      status: 'dispatched',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
