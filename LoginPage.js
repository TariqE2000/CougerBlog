// LoginPage.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email"); // can be username here
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");

  const VALID_USERS = [
    { username: "user123", password: "123123" },
    { username: "admin123", password: "123123" },
  ];

  function attemptLogin(event) {
    // Handle both button click and Enter key on form
    if (event) event.preventDefault();

    const enteredUser = (emailInput.value || "").trim().toLowerCase();
    const enteredPass = (passwordInput.value || "").trim();

    const isValid = VALID_USERS.some(
      (u) => enteredUser === u.username && enteredPass === u.password
    );

    if (isValid) {
      // Success → go to profile
      window.location.href = "Home_Page/Home_Page.html";
    } else {
      // Failure → show popup
      alert(
        "Wrong credentials. Try again.\n\nValid examples:\nuser123 / 123123\nadmin123 / 123123"
      );
    }
  }

  // Click on the Login button
  loginBtn.addEventListener("click", attemptLogin);

  // Pressing Enter will also attempt login
  form.addEventListener("submit", attemptLogin);
});
