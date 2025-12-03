// LoginPage.js - Connected to PHP Backend with Debug

// 🔧 IMPORTANT: Update this path to match your setup
const API_URL = './api.php'; // Try: './api.php' or '/your-project/api.php' or '../api.php'

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");

  // 🧪 TEST: Check if API is reachable when page loads
  testAPIConnection();

  async function testAPIConnection() {
    try {
      console.log('Testing API connection to:', API_URL);
      const response = await fetch(`${API_URL}?action=check-session`);
      console.log('API Response Status:', response.status);
      const result = await response.json();
      console.log('API Response:', result);
    } catch (error) {
      console.error('❌ API Connection Test Failed:', error);
      console.log('🔧 Please check:');
      console.log('1. Is api.php in the same folder as LoginPage.html?');
      console.log('2. Is your web server (XAMPP/WAMP) running?');
      console.log('3. Are you accessing via localhost (not file://)?');
    }
  }

  async function attemptLogin(event) {
    if (event) event.preventDefault();

    const username = emailInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('🔑 Attempting login for:', username);

    if (!username || !password) {
      alert("Please enter both username/email and password");
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
      const url = `${API_URL}?action=login`;
      console.log('📡 Sending request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Expected JSON but got:', text);
        alert('Server error: Invalid response format. Check console for details.');
        return;
      }

      const result = await response.json();
      console.log('📦 Parsed result:', result);

      if (result.success) {
        console.log('✅ Login successful!');
        // Store user info in sessionStorage for client-side use
        sessionStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Redirect based on role
        if (result.data.user.role === 'admin') {
          console.log('👑 Redirecting to admin page...');
          window.location.href = 'adminpage.html';
        } else {
          console.log('👤 Redirecting to home page...');
          window.location.href = 'Home_Page.html';
        }
      } else {
        console.warn('❌ Login failed:', result.message);
        alert(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      alert(`Connection error: ${error.message}\n\nPlease check:\n1. Is your server running?\n2. Is api.php accessible?\n3. Check browser console (F12) for details.`);
    } finally {
      // Reset button state
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  }

  loginBtn.addEventListener("click", attemptLogin);
  form.addEventListener("submit", attemptLogin);
});
