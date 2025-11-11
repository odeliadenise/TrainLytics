// Replace the empty strings with your Firebase project configuration values
export const firebaseConfig = {
	apiKey: "AIzaSyAFSwKn_417Vbolg51WI-a1nZNkPgaHOYI",
	authDomain: "trainlytics.firebaseapp.com",
	projectId: "trainlytics",
	storageBucket: "trainlytics.firebasestorage.app",
	messagingSenderId: "450292905423",
	appId: "1:450292905423:web:8f0d6fdadbc74f2531ceba",
	measurementId: "G-ZQ0X44WSZV"
};

// Expose config globally for non-module scripts
// This allows script.js (non-module) to read the config without changing page markup
window.firebaseConfig = window.firebaseConfig || firebaseConfig;

// Optional auth behavior toggles
export const authOptions = {
	// If true, users must verify their email before accessing dashboards
	enforceEmailVerification: true
};
window.authOptions = window.authOptions || authOptions;


