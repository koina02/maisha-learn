import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, 
    setDoc, 
    doc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Toast Notification System
const showToast = (message, type = 'error') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
};

// Registration Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        
        // Validation
        if (!validatePassword(password)) {
            showToast('Password must be at least 8 characters with a number and special character');
            return;
        }

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner"></div> Creating Account...';

            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            
            // Send verification email
            await sendEmailVerification(userCred.user);

            // Store user data
            await setDoc(doc(db, "users", userCred.user.uid), {
                name,
                email,
                role: "student",
                progress: {},
                emailVerified: false,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                learningPath: [],
                achievements: []
            });

            // Redirect to verification page
            window.location.href = 'email-verification.html';
            
        } catch (err) {
            handleAuthError(err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
        }
    });
}

// Password Validation
const validatePassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
};

// Error Handling
const handleAuthError = (error) => {
    switch (error.code) {
        case 'auth/email-already-in-use':
            showToast('This email is already registered');
            break;
        case 'auth/invalid-email':
            showToast('Please enter a valid email address');
            break;
        case 'auth/weak-password':
            showToast('Password must be at least 8 characters');
            break;
        case 'auth/network-request-failed':
            showToast('Network error. Please check your connection');
            break;
        default:
            showToast(error.message);
    }
};

// Login Handler (if needed)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Add login logic here
    });
}