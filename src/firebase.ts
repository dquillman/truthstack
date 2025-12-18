import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBAzE6Qy7eqlZECV3RV-_w8WpUYsREGwrI",
    authDomain: "truth-stack-dave-2025.firebaseapp.com",
    projectId: "truth-stack-dave-2025",
    storageBucket: "truth-stack-dave-2025.firebasestorage.app",
    messagingSenderId: "135586832580",
    appId: "1:135586832580:web:2748f4fccfd51f9888e991"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
