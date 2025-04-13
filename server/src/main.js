
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCQm2YfpI2nOQego8XxoxX4xQ-9rFp0Qnw",
    authDomain: "studyez2025.firebaseapp.com",
    projectId: "studyez2025",
    storageBucket: "studyez2025.firebasestorage.app",
    messagingSenderId: "958081502406",
    appId: "1:958081502406:web:075a649e681fcd08885bc7",
    measurementId: "G-SQ8FZG13RL"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
auth.languageCode = 'en';
const provider = new GoogleAuthProvider();
const googleLogin = document.getElementById("google-login-btn");
googleLogin.addEventListener("click", function(){
    signInWithPopup(auth,provider)
    .then((result) => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const user = result.user;
        console.log(user);
        window.location.href = "logged.html";
    }).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(errorCode, errorMessage);
    })
})