// AdminPage.js - Connected to PHP Backend

const API_URL = 'api.php';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is admin
  await checkAdminSession();
  
  // Load dashboard data
  await loadDashboardStats();
  await loadUsers();
  await loadAllPosts();
  await loadAnnouncements();
});

// ---- Check admin session ----
async function checkAdminSession() {
  try {
    const response = await fetch(`${API_URL}?action=check-session`);
    const result = await response.json();
    
    if (!result.success || result.data.role !== 'admin') {
      alert('Access denied. Admin privileges required.');
      window.location.href = 'LoginPage.html';
    }
  } catch (error) {
    console.error('Session check error:', error);
    window.location.href = 'LoginPage.html';
  }
}

// ---- Load dashboard statistics ----
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_URL}?action=dashboard-stats`);
    const result = await response.json();
    
    if (result.success && result.data.stats) {
      document.getElementById('userCount').textContent = result.data.stats.users;
      document.getElementById('postCount').textContent = result.data.stats.posts;
      document.getElementById('annCount').textContent = result.data.stats.announcements;
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// ---- Load all users ----
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}?action=get-users`);
    const result = await response.json();
    
    if (result.success && result.data.users) {
      displayUsers(result.data.users);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function displayUsers(users) {
  const userTable = document.getElementById('userTable');
  userTable.innerHTML = users
    .map(u => `
      <tr>
        <td>${u.first_name || ''} ${u.last_name || ''}</td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
      </tr>
    `)
    .join('');
}

// ---- Load all posts (including pending) ----
async function loadAllPosts() {
  try {
    // Load all posts regardless of status for admin
    const response = await fetch(`${API_URL}?action=get-posts&status=`);
    const result = await response.json();
    
    if (result.success && result.data.posts) {
      displayPosts(result.data.posts);
    }
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function displayPosts(posts) {
  const postTable = document.getElementById('postTable');
  postTable.innerHTML = posts
    .map(p => `
      <tr>
        <td>${p.title}</td>
        <td>${p.username || 'Unknown'}</td>
        <td>
          <select class="post-status" data-post-id="${p.id}">
            <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Approved" ${p.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${p.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td>
          <button class="deletePost btn-danger" data-id="${p.id}">Delete</button>
        </td>
      </tr>
    `)
    .join('');
    
  // Add event listeners for status changes
  document.querySelectorAll('.post-status').forEach(select => {
    select.addEventListener('change', async (e) => {
      const postId = e.target.dataset.postId;
      const newStatus = e.target.value;
      await updatePostStatus(postId, newStatus);
    });
  });
}

// ---- Update post status ----
async function updatePostStatus(postId, status) {
  try {
    const response = await fetch(`${API_URL}?action=update-post-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_id: postId,
        status: status
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await loadDashboardStats();
      alert('Post status updated successfully!');
    } else {
      alert(result.message || 'Failed to update post status');
    }
  } catch (error) {
    console.error('Error updating post status:', error);
    alert('An error occurred. Please try again.');
  }
}

// ---- Delete post ----
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("deletePost")) {
    const id = parseInt(e.target.dataset.id);
    
    if (!confirm("Delete this post?")) return;
    
    e.target.disabled = true;
    e.target.textContent = 'Deleting...';
    
    try {
      const response = await fetch(`${API_URL}?action=delete-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadAllPosts();
        await loadDashboardStats();
        alert("Post deleted successfully!");
      } else {
        alert(result.message || 'Failed to delete post');
        e.target.disabled = false;
        e.target.textContent = 'Delete';
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('An error occurred. Please try again.');
      e.target.disabled = false;
      e.target.textContent = 'Delete';
    }
  }
});

// ---- Load announcements ----
async function loadAnnouncements() {
  try {
    const response = await fetch(`${API_URL}?action=get-announcements`);
    const result = await response.json();
    
    if (result.success && result.data.announcements) {
      displayAnnouncements(result.data.announcements);
    }
  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

function displayAnnouncements(announcements) {
  const annList = document.getElementById('annList');
  annList.innerHTML = announcements
    .map(a => `
      <li>
        <strong>${a.title}</strong>: ${a.body}
        <button class="deleteAnn btn-sm" data-id="${a.id}">Delete</button>
      </li>
    `)
    .join('');
    
  // Add delete listeners
  document.querySelectorAll('.deleteAnn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const annId = e.target.dataset.id;
      if (confirm('Delete this announcement?')) {
        await deleteAnnouncement(annId);
      }
    });
  });
}

// ---- Add announcement ----
document.getElementById("addAnnouncement").addEventListener("click", async () => {
  const title = document.getElementById("annTitle").value.trim();
  const body = document.getElementById("annBody").value.trim();
  
  if (!title || !body) {
    alert("Please fill out both fields.");
    return;
  }
  
  const btn = document.getElementById("addAnnouncement");
  btn.disabled = true;
  btn.textContent = 'Adding...';
  
  try {
    const response = await fetch(`${API_URL}?action=create-announcement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        body: body
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      document.getElementById("annTitle").value = "";
      document.getElementById("annBody").value = "";
      await loadAnnouncements();
      await loadDashboardStats();
      alert('Announcement created successfully!');
    } else {
      alert(result.message || 'Failed to create announcement');
    }
  } catch (error) {
    console.error('Error creating announcement:', error);
    alert('An error occurred. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add';
  }
});

// ---- Delete announcement ----
async function deleteAnnouncement(annId) {
  try {
    const response = await fetch(`${API_URL}?action=delete-announcement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        announcement_id: annId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await loadAnnouncements();
      await loadDashboardStats();
      alert('Announcement deleted successfully!');
    } else {
      alert(result.message || 'Failed to delete announcement');
    }
  } catch (error) {
    console.error('Error deleting announcement:', error);
    alert('An error occurred. Please try again.');
  }
}

// ---- Tab switching ----
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});