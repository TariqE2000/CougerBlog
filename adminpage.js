const API_URL = "api.php";

document.addEventListener("DOMContentLoaded", async () => {
  await checkAdminSession();
  await loadDashboardStats();
  await loadUsers();
  await loadAllPosts();
  await loadAnnouncements();
});

// -------------------------
// CHECK ADMIN SESSION
// -------------------------
async function checkAdminSession() {
  const response = await fetch(`${API_URL}?action=check-session`);
  const result = await response.json();

  if (!result.success || result.data.role !== "admin") {
    alert("Admin access required.");
    window.location.href = "LoginPage.html";
  }
}

// -------------------------
// DASHBOARD COUNTS
// -------------------------
async function loadDashboardStats() {
  const response = await fetch(`${API_URL}?action=dashboard-stats`);
  const data = await response.json();

  if (data.success) {
    document.getElementById("userCount").textContent = data.data.stats.users;
    document.getElementById("postCount").textContent = data.data.stats.posts;
    document.getElementById("annCount").textContent = data.data.stats.announcements;
  }
}

// -------------------------
// LOAD USERS
// -------------------------
async function loadUsers() {
  const response = await fetch(`${API_URL}?action=get-users`);
  const result = await response.json();

  if (!result.success) return;

  const tbody = document.getElementById("userTable");
  tbody.innerHTML = result.data.users
  .map((u) => {
    const email = u.email || "";

    // "jordan@csusm.edu" -> "jordan"
    const namePart = email.split("@")[0] || "";

    // Capitalize first letter: "jordan" -> "Jordan"
    const displayName =
      namePart.length > 0
        ? namePart.charAt(0).toUpperCase() + namePart.slice(1)
        : "";

    const id = u.id || u.user_id; // whichever your API returns

    return `
      <tr>
        <td>${displayName}</td>
        <td>${email}</td>
        <td>${u.role}</td>
        <td><button class="deleteUser" data-id="${id}">Delete</button></td>
      </tr>
    `;
  })
  .join("");



  document.querySelectorAll(".deleteUser").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this user?")) return;
      await deleteUser(btn.dataset.id);
    });
  });
}

async function deleteUser(userId) {
  const response = await fetch(`${API_URL}?action=delete-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  const result = await response.json();
  if (result.success) {
    alert("User deleted.");
    loadUsers();
    loadDashboardStats();
  } else alert(result.message);
}

// -------------------------
// LOAD POSTS
// -------------------------
async function loadAllPosts() {
  const response = await fetch(`${API_URL}?action=get-posts`);
  const result = await response.json();

  const tbody = document.getElementById("postTable");
  tbody.innerHTML = result.data.posts
    .map(
      (p) => `
      <tr>
        <td>${p.title}</td>
        <td>${p.username}</td>
        <td>
          <select data-id="${p.id}" class="postStatus">
            <option ${p.status === "Pending" ? "selected" : ""}>Pending</option>
            <option ${p.status === "Approved" ? "selected" : ""}>Approved</option>
            <option ${p.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>
        </td>
        <td><button class="deletePost" data-id="${p.id}">Delete</button></td>
      </tr>
    `
    )
    .join("");

  document.querySelectorAll(".postStatus").forEach((select) => {
    select.addEventListener("change", async () => {
      await updatePostStatus(select.dataset.id, select.value);
    });
  });

  document.querySelectorAll(".deletePost").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      await deletePost(btn.dataset.id);
    });
  });
}

async function updatePostStatus(postId, status) {
  await fetch(`${API_URL}?action=update-post-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post_id: postId, status }),
  });
}

// -------------------------
// DELETE POST
// -------------------------
async function deletePost(id) {
  const response = await fetch(`${API_URL}?action=delete-post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post_id: id }),
  });

  const result = await response.json();
  if (result.success) {
    alert("Post deleted.");
    loadAllPosts();
    loadDashboardStats();
  } else alert(result.message);
}

// -------------------------
// ANNOUNCEMENTS
// -------------------------
async function loadAnnouncements() {
  const response = await fetch(`${API_URL}?action=get-announcements`);
  const result = await response.json();

  if (!result.success) return;

  const ul = document.getElementById("annList");
  ul.innerHTML = result.data.announcements
    .map(
      (a) => `
      <li>
        <strong>${a.title}</strong>: ${a.content}
        <button class="deleteAnn" data-id="${a.announcement_id}">Delete</button>
      </li>
    `
    )
    .join("");

  document.querySelectorAll(".deleteAnn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete announcement?")) {
        await deleteAnnouncement(btn.dataset.id);
      }
    });
  });
}


document.getElementById("addAnnouncement").addEventListener("click", async () => {
  const title = document.getElementById("annTitle").value.trim();
  const body = document.getElementById("annBody").value.trim();

  if (!title || !body) return alert("Fill both fields!");

  await fetch(`${API_URL}?action=create-announcement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });

  loadAnnouncements();
  loadDashboardStats();
});

// -------------------------
// DELETE ANNOUNCEMENT
// -------------------------
async function deleteAnnouncement(id) {
  await fetch(`${API_URL}?action=delete-announcement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ announcement_id: id }),
  });

  loadAnnouncements();
  loadDashboardStats();
}

// -------------------------
// TAB SYSTEM
// -------------------------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".content").forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});
