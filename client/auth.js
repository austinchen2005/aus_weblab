// Authentication state
let currentUser = null;

// Check if user is logged in
function checkAuth() {
  return get('/api/whoami')
    .then((user) => {
      if (user._id) {
        currentUser = user;
        return true;
      } else {
        currentUser = null;
        return false;
      }
    })
    .catch((err) => {
      console.log('Auth check failed:', err);
      currentUser = null;
      return false;
    });
}

// Handle Google login - this is called by Google's script
window.handleLogin = function(credentialResponse) {
  const token = credentialResponse.credential;
  console.log('Attempting login with token...');
  post('/api/login', { token: token })
    .then((user) => {
      console.log('Login successful:', user);
      currentUser = user;
      showApp();
      if (typeof updateStatsDisplay === 'function') {
        updateStatsDisplay();
      }
    })
    .catch((err) => {
      console.error('Login failed:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      alert('Login failed: ' + (err.message || err.err || 'Unknown error. Check console for details.'));
    });
};

// Handle logout
window.handleLogout = function() {
  post('/api/logout')
    .then(() => {
      currentUser = null;
      showLogin();
    })
    .catch((err) => {
      console.log('Logout failed:', err);
    });
};

// Show login page
function showLogin() {
  document.getElementById('login-page').style.display = 'block';
  document.getElementById('app-content').style.display = 'none';
}

// Show app content
function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  // Load stats after showing app
  if (typeof loadStats === 'function') {
    loadStats();
  }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
  // DISABLED: Skip login for now
  showApp();
  if (typeof loadStats === 'function') {
    loadStats();
  } else if (typeof updateStatsDisplay === 'function') {
    updateStatsDisplay();
  }
  
  // Original login check (disabled):
  // checkAuth().then((isLoggedIn) => {
  //   if (isLoggedIn) {
  //     showApp();
  //     updateStatsDisplay();
  //   } else {
  //     showLogin();
  //   }
  // });
});
