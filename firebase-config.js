// Firebase configuration (ES Module)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAFSwKn_417Vbolg51WI-a1nZNkPgaHOYI",
  authDomain: "trainlytics.firebaseapp.com",
  projectId: "trainlytics",
  storageBucket: "trainlytics.firebasestorage.app",
  messagingSenderId: "450292905423",
  appId: "1:450292905423:web:8f0d6fdadbc74f2531ceba",
  measurementId: "G-ZQ0X44WSZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth behavior options
export const authOptions = {
  enforceEmailVerification: false
};


