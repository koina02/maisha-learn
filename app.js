// Auth State Listener
auth.onAuthStateChanged(user => {
    const authLink = document.getElementById('authLink');
    if (user) {
        authLink.textContent = 'Logout';
        authLink.href = '#';
        authLink.addEventListener('click', () => auth.signOut());
    } else {
        authLink.textContent = 'Login';
        authLink.href = 'login.html';
    }
});

// Common Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Login/Register Logic
document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => showError(error.message));
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;
            
            auth.createUserWithEmailAndPassword(email, password)
                .then(() => {
                    // Create user profile in Firestore
                    return db.collection('users').doc(user.uid).set({
                        email: email,
                        joined: new Date(),
                        progress: {}
                    });
                })
                .catch(error => showError(error.message));
        });
    }
});