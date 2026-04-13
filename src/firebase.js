import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBb9MDKyLHvPqtcszu_eeMZSge7XepPXQY",
  authDomain: "eod-logger.firebaseapp.com",
  projectId: "eod-logger",
  storageBucket: "eod-logger.firebasestorage.app",
  messagingSenderId: "771229524735",
  appId: "1:771229524735:web:fceb27d63ce6eb7460e2ca"
};

const app = initializeApp(firebaseConfig);

// 🔥 THIS IS WHAT YOU WERE MISSING
export const db = getFirestore(app);