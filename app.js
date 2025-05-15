import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

// Auth State Listener with Redirects
auth.onAuthStateChanged(async user => {
    const authLink = document.getElementById('authLink');
    const currentPath = window.location.pathname;
    
    if (user) {
        // Update UI
        authLink.textContent = 'Logout';
        authLink.href = '#';
        authLink.onclick = handleLogout;

        // Redirect unverified users
        if (!user.emailVerified && !currentPath.includes('verify-email.html')) {
            window.location.href = 'verify-email.html';
        }
        
        // Redirect authenticated users away from auth pages
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Update UI
        authLink.textContent = 'Login';
        authLink.href = 'login.html';
        authLink.onclick = null;

        // Redirect to login if accessing protected pages
        if (currentPath.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Enhanced Error Handling
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

// Unified Auth Handler
async function handleAuthAction(formId, action) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = action.loadingText;

            const email = form.querySelector('#email').value.trim();
            const password = form.querySelector('#password').value;
            
            // Additional validation
            if (!validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (action.type === 'register') {
                const name = form.querySelector('#name').value.trim();
                if (!name) throw new Error('Please enter your full name');
                if (!validatePassword(password)) {
                    throw new Error('Password must be 8+ chars with a number and special character');
                }
            }

            // Execute auth action
            const userCred = await action.handler(email, password);
            
            // Post-auth actions
            if (action.type === 'register') {
                await sendEmailVerification(userCred.user);
                await createUserProfile(userCred.user, form);
                showToast('Registration successful! Please verify your email', 'success');
                window.location.href = 'verify-email.html';
            } else {
                if (!userCred.user.emailVerified) {
                    await auth.signOut();
                    throw new Error('Please verify your email before logging in');
                }
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            handleAuthError(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = action.defaultText;
        }
    });
}

// Validation Helpers
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
}

// Enhanced Error Handler
function handleAuthError(error) {
    const messages = {
        'auth/wrong-password': 'Incorrect password',
        'auth/user-not-found': 'Account not found',
        'auth/email-already-in-use': 'Email already registered',
        'auth/network-request-failed': 'Network error. Check your connection',
        'auth/too-many-requests': 'Too many attempts. Try again later'
    };

    showToast(messages[error.code] || error.message);
}

// User Profile Creation
async function createUserProfile(user, form) {
    await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: form.querySelector('#name').value.trim(),
        role: 'student',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        emailVerified: false,
        progress: {},
        learningPath: []
    });
}

// Logout Handler
async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        showToast('Logout failed: ' + error.message);
    }
}

// Initialize Auth Handlers
document.addEventListener('DOMContentLoaded', () => {
    handleAuthAction('loginForm', {
        type: 'login',
        loadingText: '<div class="spinner"></div> Signing In...',
        defaultText: 'Sign In',
        handler: (email, password) => signInWithEmailAndPassword(auth, email, password)
    });

    handleAuthAction('registerForm', {
        type: 'register',
        loadingText: '<div class="spinner"></div> Creating Account...',
        defaultText: 'Create Account',
        handler: (email, password) => createUserWithEmailAndPassword(auth, email, password)
    });
});
