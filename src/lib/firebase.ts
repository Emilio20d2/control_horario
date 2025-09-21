

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  "projectId": "shiftmaster-9iefy",
  "appId": "1:904324719398:web:448d7c2c842fd59778d7e7",
  "storageBucket": "shiftmaster-9iefy.firebasestorage.app",
  "apiKey": "AIzaSyBoZTFnt7kh_moxTzuS5zR1LNe86nvuOs4",
  "authDomain": "shiftmaster-9iefy.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "904324719398"
};


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Connect to the default database
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);


export { app, db, auth, functions };











