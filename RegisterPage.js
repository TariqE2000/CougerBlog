// RegisterPage.js - Connected to PHP Backend

const API_URL = './api.php';

document.addEventListener('DOMContentLoaded', () => {
  const form                 = document.querySelector('form');
  const firstNameInput       = document.getElementById('firstName');
  const lastNameInput        = document.getElementById('lastName');
  const emailInput           = document.getElementById('email');
  const passwordInput        = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const submitBtn            = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName       = firstNameInput.value.trim();
    const lastName        = lastNameInput.value.trim();
    const email           = emailInput.value.trim();
    const password        = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // ---------- client-side validation ----------
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      alert('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    // You can enforce CSUSM emails if you want:
    // if (!email.endsWith('@csusm.edu')) { ... }

    // Create a username from the email (everything before @)
    const username = email.split('@')[0];

    // ---------- call PHP API ----------
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';

    try {
      const response = await fetch(`${API_URL}?action=register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username:   username,
          email:      email,
          password:   password,
          first_name: firstName,
          last_name:  lastName
        })
      });

      if (!response.ok) {
        console.error('Register HTTP error:', response.status);
        alert('Server error while creating account. Please try again.');
        return;
      }

      const result = await response.json();
      console.log('Register result:', result);

      if (result.success) {
        alert('Registration successful! You can now log in.');
        window.location.href = 'LoginPage.html';
      } else {
        alert(result.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('An error occurred during registration. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
