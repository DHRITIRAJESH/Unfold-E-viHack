// This module centralizes all Firebase-related logic.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './config.js'; 
// --- Module-level variables ---
let db;
let auth;
let currentUserId = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * Initializes the Firebase app and sets up authentication.
 * @param {function} onAuthReady - A callback function to run once authentication is complete.
 */
export async function initializeFirebase(onAuthReady) {
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    try {
        if (Object.keys(firebaseConfig).length < 5) {
            console.error("Firebase config is missing. Running in local mode.");
            onAuthReady(); // Proceed without Firebase
            return;
        }
        
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
            } else {
                currentUserId = `anon-${crypto.randomUUID()}`;
                console.log("Using anonymous ID:", currentUserId);
            }
            onAuthReady(currentUserId);
        });

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Firebase initialization or authentication failed:", error);
        document.getElementById('main-content').innerHTML = `<p class="text-red-400">Error loading application. Check console.</p>`;
    }
}

/**
 * Creates a real-time listener for a mind map document in Firestore.
 * @param {string} caseId - The ID of the case to listen for.
 * @param {function} callback - Function to call with the data when it changes.
 * @returns {function} - The unsubscribe function for the listener.
 */
export function listenToMindMap(caseId, callback) {
    if (!db || !currentUserId) return () => {};
    const ref = doc(db, 'artifacts', appId, 'users', currentUserId, 'mindmaps', caseId);
    return onSnapshot(ref, callback);
}

/**
 * Saves a mind map's state to Firestore.
 * @param {string} caseId - The ID of the current case.
 * @param {object} mindMapData - The mind map object { nodes, links }.
 */
export async function saveMindMap(caseId, mindMapData) {
    if (!db || !currentUserId || !caseId) return;
    const ref = doc(db, 'artifacts', appId, 'users', currentUserId, 'mindmaps', caseId);
    
    try {
        await setDoc(ref, {
            ...mindMapData,
            lastUpdated: new Date()
        }, { merge: false });
    } catch (e) {
        console.error("Error saving document:", e);
    }
}