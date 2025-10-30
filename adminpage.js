const users = JSON.parse(localStorage.getItem("cb_users")) || [
  { name: "Jordan Kopp", email: "jkopp@csusm.edu", status: "Active" },
  { name: "Daisy Lee", email: "dlee@csusm.edu", status: "Active" }
];

const posts = JSON.parse(localStorage.getItem("cb_posts")) || [
  { id: 1, title: "Campus Life Tips", author: "Jordan Kopp", status: "Approved" },
  { id: 2, title: "Dorm Hacks", author: "Daisy Lee", status: "Pending" }
];

const announcements = JSON.parse(localStorage.getItem("cb_anns")) || [];

// Save data to localStorage
function saveAll() {
  localStorage.setItem("cb_users", JSON.stringify(users));
  localStorage.setItem("cb_posts", JSON.stringify(posts));
  localStorage.setItem("cb_anns", JSON.stringify(announcements));
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// Render data tables
function renderData() {
  document.getElementById("userCount").textContent = users.length;
  document.getElementById("postCount").textContent = posts.length;
  document.getElementById("annCount").textContent = announcements.length;

  document.getElementById("userTable").innerHTML = users
    .map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.status}</td></tr>`)
    .join("");

  document.getElementById("postTable").innerHTML = posts
    .map(
      p => `<tr>
        <td>${p.title}</td>
        <td>${p.author}</td>
        <td>${p.status}</td>
        <td><button class="deletePost" data-id="${p.id}">Delete</button></td>
      </tr>`
    )
    .join("");

  document.getElementById("annList").innerHTML = announcements
    .map(a => `<li><strong>${a.title}</strong>: ${a.body}</li>`)
    .join("");
}

// Delete post globally (Admin)
document.addEventListener("click", e => {
  if (e.target.classList.contains("deletePost")) {
    const id = parseInt(e.target.dataset.id);
    const index = posts.findIndex(p => p.id === id);
    if (index > -1 && confirm("Delete this post?")) {
      posts.splice(index, 1);
      saveAll();
      renderData();
      alert("Post deleted successfully!");
    }
  }
});

// Add announcements
document.getElementById("addAnnouncement").addEventListener("click", () => {
  const title = document.getElementById("annTitle").value.trim();
  const body = document.getElementById("annBody").value.trim();
  if (!title || !body) return alert("Please fill out both fields.");
  announcements.push({ title, body });
  saveAll();
  document.getElementById("annTitle").value = "";
  document.getElementById("annBody").value = "";
  renderData();
});

renderData();
