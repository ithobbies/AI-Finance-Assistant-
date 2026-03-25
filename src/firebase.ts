import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SavedAIReport } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export const saveReportToArchive = async (reportData: Omit<SavedAIReport, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'ai_reports'), reportData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving report: ", error);
    throw error;
  }
};

export const getArchivedReports = async (): Promise<SavedAIReport[]> => {
  if (!auth.currentUser) return [];
  
  try {
    const q = query(
      collection(db, 'ai_reports'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedAIReport));
  } catch (error) {
    console.error("Error getting archived reports: ", error);
    throw error;
  }
};
