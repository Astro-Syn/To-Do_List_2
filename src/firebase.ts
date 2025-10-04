import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'


const firebaseConfig = {
  apiKey: "AIzaSyDCUITNpfs2UcadHWt67fxwaw6Qg97ebRY",
  authDomain: "to-do-list-7a617.firebaseapp.com",
  projectId: "to-do-list-7a617",
  storageBucket: "to-do-list-7a617.firebasestorage.app",
  messagingSenderId: "300691325361",
  appId: "1:300691325361:web:4bde55bcabf3f76e8a7d90",
  measurementId: "G-WN68HRXM1D"
};


const app = initializeApp(firebaseConfig)


export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
