import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL,
  deleteObject 
} from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Read from env with fallback to the user-provided Spices Dabba Billing credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBCK7DEl714wLMuSzKgXKI-9V61AN5sU_o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "spices-dabba-billing.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "spices-dabba-billing",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "spices-dabba-billing.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1067299942841",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1067299942841:web:b79c01f7a149ab73f9c668",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5DX55497XX"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser environments where supported)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Ignore analytics init failure in non-supported environments
  });
}

export { 
  app, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
