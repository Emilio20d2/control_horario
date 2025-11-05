
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoZTFnt7kh_moxTzuS5zR1LNe86nvuOs4",
  authDomain: "shiftmaster-9iefy.firebaseapp.com",
  databaseURL: "https://shiftmaster-9iefy-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "shiftmaster-9iefy",
  storageBucket: "shiftmaster-9iefy.appspot.com",
  messagingSenderId: "904324719398",
  appId: "1:904324719398:web:44d3e5892231f82378d7e7"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, 'basedatos1224'); // Explicitly connect to the correct database
const auth = getAuth(app);


export { app, db, auth, firebaseConfig };
