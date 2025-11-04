// LoginPage.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");

  const VALID_USERS = [
    { username: "user123",  password: "123123", role: "user" },
    { username: "admin123", password: "123123", role: "admin" },
  ];

  function attemptLogin(event) {
    // Prevent form submit refresh
    if (event) event.preventDefault();

    const enteredUser = (emailInput.value || "").trim().toLowerCase();
    const enteredPass = (passwordInput.value || "").trim();

    const foundUser = VALID_USERS.find(
      (u) => enteredUser === u.username && enteredPass === u.password
    );

    if (foundUser) {
      // ✅ Redirect based on role
      if (foundUser.role === "admin") {
        window.location.href = "adminpage.html";
      } else {
        window.location.href = "Home_Page.html";
      }
    } else {
      alert(
        "Wrong credentials. Try again.\n\nValid examples:\nuser123 / 123123\nadmin123 / 123123"
      );
    }
  }

  loginBtn.addEventListener("click", attemptLogin);
  form.addEventListener("submit", attemptLogin);
});

