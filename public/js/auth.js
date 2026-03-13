const configRes = await fetch('/api/config/firebase');
const firebaseConfig = await configRes.json();

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let isLogin = true;

const toggleBtn = document.getElementById('toggleBtn');
if(toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    document.getElementById('formTitle').innerText = isLogin ? 'Sign In' : 'Sign Up';
    document.getElementById('submitBtn').innerText = isLogin ? 'Sign In' : 'Join now';
    document.getElementById('toggleText').innerText = isLogin ? 'New to LinkedIn?' : 'Already on LinkedIn?';
    document.getElementById('toggleBtn').innerText = isLogin ? 'Join now' : 'Sign In';
    document.getElementById('nameDiv').classList.toggle('hidden', isLogin);
    if (!isLogin) document.getElementById('nameInput').setAttribute('required', 'true');
    else document.getElementById('nameInput').removeAttribute('required');
  });
}

const authForm = document.getElementById('authForm');
if(authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const name = document.getElementById('nameInput').value;

    try {
      if (isLogin) {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const token = await userCredential.user.getIdToken();
        // Create user in our DB
        await fetch('/api/profile/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, email })
        });
      }
      window.location.href = '/feed';
    } catch (error) {
      console.error('Auth Debug Info:', error);
      if (error.code && error.code.startsWith('auth/')) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          alert('Invalid Email or Password. If you do not have an account, please click "Join now" to sign up first!');
        } else if (error.code === 'auth/operation-not-allowed') {
          alert('Firebase Error: Email/Password Authentication is not enabled. Please go to your Firebase Console -> Authentication -> Sign-in Method and enable "Email/Password".');
        } else {
          alert('Firebase Error: ' + error.message);
        }
      } else if (error.message === 'Failed to fetch') {
        alert('Authentication Error: Cannot connect to the server. Please check if your terminal is still running at http://localhost:3000');
      } else {
        alert('Authentication Error: ' + error.message);
      }
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (user && window.location.pathname === '/') {
    window.location.href = '/feed';
  }
});
