// ProfilePage.js - Connected to PHP Backend

const API_URL = './api.php';

document.addEventListener('DOMContentLoaded', () => {
  const displayUsernameEl = document.getElementById('display-username');
  const editLink          = document.getElementById('edit-username');
  const editControls      = document.getElementById('edit-controls');
  const usernameInput     = document.getElementById('username-input');
  const saveUsernameBtn   = document.getElementById('save-username');
  const cancelEditBtn     = document.getElementById('cancel-edit');

  const totalViewsEl      = document.querySelector('.profile-stats .stat:nth-child(1) .stat-value');
  const totalPostsEl      = document.querySelector('.profile-stats .stat:nth-child(2) .stat-value');

  const postsGrid         = document.querySelector('.posts-grid');

  // Modal for editing posts
  const postModal         = document.getElementById('post-modal');
  const modalBackdrop     = postModal?.querySelector('[data-close-modal]');
  const modalCloseBtn     = postModal?.querySelector('.modal-close');
  const editTitleInput    = document.getElementById('edit-title');
  const editBodyTextarea  = document.getElementById('edit-body');
  const savePostBtn       = document.getElementById('save-post');
  const deletePostBtn     = document.getElementById('delete-post');

  // 🔍 search bar in navbar
  const searchInput       = document.querySelector('.search-input');

  let currentUser  = null;
  let userId       = null;
  let posts        = [];      // this user's posts
  let editingPost  = null;
  let searchItems  = [];      // [{el, text}] for profile search

  // ---------- helpers ----------

  function showSectionError(message) {
    if (!postsGrid) return;
    postsGrid.innerHTML = '';
    const div = document.createElement('div');
    div.style.color = '#e5e7eb';
    div.style.padding = '16px';
    div.textContent = message;
    postsGrid.appendChild(div);
  }

  function htmlToPlainText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return dateString;
    const opts = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
  }

  function openPostModal() {
    if (!postModal) return;
    postModal.classList.add('open');
    postModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => editTitleInput?.focus(), 0);
  }

  function closePostModal() {
    if (!postModal) return;
    postModal.classList.remove('open');
    postModal.setAttribute('aria-hidden', 'true');
    editingPost = null;
  }

  // ---------- username editing UI ----------

  function startUsernameEdit() {
    if (!currentUser) return;
    editLink.style.display          = 'none';
    displayUsernameEl.style.display = 'none';
    editControls.style.display      = 'flex';
    usernameInput.value             = currentUser.username || '';
  }

  function cancelUsernameEdit() {
    editControls.style.display      = 'none';
    displayUsernameEl.style.display = '';
    editLink.style.display          = '';
  }

  async function saveUsername() {
    const newUsername = usernameInput.value.trim();
    if (!newUsername) {
      alert('Username cannot be empty.');
      return;
    }
    if (!currentUser || !userId) return;

    const payload = {
      user_id: userId,
      username: newUsername,
      email: currentUser.email || '',
      first_name: currentUser.first_name || '',
      last_name: currentUser.last_name || ''
    };

    try {
      const resp = await fetch(`${API_URL}?action=update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        console.error('Update profile failed with status', resp.status);
        alert('Failed to update profile. Please try again.');
        return;
      }

      const result = await resp.json();
      if (!result.success) {
        alert(result.message || 'Failed to update profile.');
        return;
      }

      currentUser.username = newUsername;
      // Prefer full name if present, otherwise new username
      const displayName =
        (currentUser.first_name || currentUser.last_name)
          ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
          : newUsername;
      displayUsernameEl.textContent = displayName || 'Unnamed user';

      // Keep sessionStorage in sync
      try {
        const stored = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (stored) {
          stored.username = newUsername;
          sessionStorage.setItem('user', JSON.stringify(stored));
        }
      } catch (_) {}

      cancelUsernameEdit();
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('An error occurred while updating your profile.');
    }
  }

  // ---------- posts UI ----------

  function rebuildSearchIndex() {
    searchItems = [];
    if (!postsGrid) return;
    postsGrid.querySelectorAll('.post-card').forEach(card => {
      const text = [
        card.querySelector('.post-card-title')?.textContent || '',
        ...card.querySelectorAll('.post-card-body p')
      ].map(p => p.textContent || '').join(' ').toLowerCase();
      searchItems.push({ el: card, text });
    });
  }

  function applyProfileSearch() {
    if (!searchInput) return;
    const q = searchInput.value.trim().toLowerCase();
    let shown = 0;

    searchItems.forEach(({ el, text }) => {
      const match = !q || text.includes(q);
      el.hidden = !match;
      if (match) shown++;
    });

    // optional: could show "no results" message here if you want
  }

  function renderPostsGrid() {
    if (!postsGrid) return;

    postsGrid.innerHTML = '';

    if (!posts.length) {
      const empty = document.createElement('p');
      empty.style.color = '#e5e7eb';
      empty.textContent = 'You have not created any posts yet.';
      postsGrid.appendChild(empty);
      searchItems = [];
      return;
    }

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'post-card';
      card.dataset.postId = post.id ?? post.post_id ?? '';

      const header = document.createElement('header');
      header.className = 'post-card-header';

      const titleEl = document.createElement('h3');
      titleEl.className = 'post-card-title';
      titleEl.textContent = post.title || 'Untitled';

      header.appendChild(titleEl);

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'post-card-body';

      const p = document.createElement('p');
      const text = htmlToPlainText(post.content || post.body || '');
      p.textContent = text.length > 200 ? text.slice(0, 197) + '…' : text || '—';

      bodyDiv.appendChild(p);

      const footer = document.createElement('footer');
      footer.className = 'post-card-meta';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'date';

      const time = document.createElement('time');
      time.dateTime = post.created_at || '';
      const formatted = formatDate(post.created_at);
      time.textContent = formatted ? `Posted on ${formatted}` : '';

      dateSpan.appendChild(time);

      const viewsSpan = document.createElement('span');
      viewsSpan.className = 'views';
      const views = post.views ?? post.view_count ?? 0;
      viewsSpan.textContent = `views ${views}`;

      footer.appendChild(dateSpan);
      footer.appendChild(viewsSpan);

      card.appendChild(header);
      card.appendChild(bodyDiv);
      card.appendChild(footer);

      // clicking card opens edit modal
      card.addEventListener('click', () => {
        editingPost = post;
        if (editTitleInput) editTitleInput.value = post.title || '';
        if (editBodyTextarea) {
          editBodyTextarea.value = htmlToPlainText(post.content || post.body || '');
        }
        openPostModal();
      });

      postsGrid.appendChild(card);
    });

    // after cards exist, rebuild search index
    rebuildSearchIndex();
    applyProfileSearch(); // respect any existing query
  }

  function updateStatsFromPosts() {
    if (totalPostsEl) {
      totalPostsEl.textContent = posts.length.toString();
    }
    if (totalViewsEl && !totalViewsEl.dataset.locked) {
      totalViewsEl.textContent = '0';
    }
  }

  // ---------- post CRUD with API ----------

  async function loadUserPosts() {
    if (!userId) return;

    try {
      const resp = await fetch(`${API_URL}?action=get-user-posts&user_id=${encodeURIComponent(userId)}`);
      if (!resp.ok) {
        console.error('Failed to load user posts:', resp.status);
        showSectionError('Could not load your posts.');
        return;
      }

      const result = await resp.json();
      const inner = result.data || {};
      posts = Array.isArray(inner.posts) ? inner.posts : [];

      renderPostsGrid();
      updateStatsFromPosts();
    } catch (err) {
      console.error('Error loading user posts:', err);
      showSectionError('An error occurred while loading your posts.');
    }
  }

  async function savePostEdits() {
    if (!editingPost) {
      closePostModal();
      return;
    }
    const newTitle = editTitleInput.value.trim();
    const newBody  = editBodyTextarea.value.trim();

    if (!newTitle || !newBody) {
      alert('Both title and body are required.');
      return;
    }

    const payload = {
      post_id: editingPost.id ?? editingPost.post_id,
      title: newTitle,
      body: newBody
    };

    try {
      const resp = await fetch(`${API_URL}?action=update-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        console.error('Update post failed with status', resp.status);
        alert('Failed to update post.');
        return;
      }

      const result = await resp.json();
      if (!result.success) {
        alert(result.message || 'Failed to update post.');
        return;
      }

      editingPost.title = newTitle;
      editingPost.content = newBody;

      renderPostsGrid();
      closePostModal();
    } catch (err) {
      console.error('Error updating post:', err);
      alert('An error occurred while updating the post.');
    }
  }

  async function deleteCurrentPost() {
    if (!editingPost) {
      closePostModal();
      return;
    }
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const payload = {
      post_id: editingPost.id ?? editingPost.post_id
    };

    try {
      const resp = await fetch(`${API_URL}?action=delete-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        console.error('Delete post failed with status', resp.status);
        alert('Failed to delete post.');
        return;
      }

      const result = await resp.json();
      if (!result.success) {
        alert(result.message || 'Failed to delete post.');
        return;
      }

      posts = posts.filter(p => (p.id ?? p.post_id) !== (editingPost.id ?? editingPost.post_id));
      renderPostsGrid();
      updateStatsFromPosts();
      closePostModal();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('An error occurred while deleting the post.');
    }
  }

  // ---------- initial load ----------

  async function initProfile() {
    let storedUser = null;
    try {
      storedUser = JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch (_) {
      storedUser = null;
    }

    try {
      const resp = await fetch(`${API_URL}?action=check-session`);
      if (!resp.ok) {
        console.error('check-session failed with status', resp.status);
        window.location.href = 'LoginPage.html';
        return;
      }

      const result = await resp.json();
      if (!result.success) {
        alert('Please log in to view your profile.');
        window.location.href = 'LoginPage.html';
        return;
      }

      const serverUser = result.data || {};
      userId = serverUser.user_id;

      currentUser = {
        id: storedUser?.id ?? storedUser?.user_id ?? serverUser.user_id,
        user_id: serverUser.user_id,
        username: storedUser?.username ?? serverUser.username,
        email: storedUser?.email ?? serverUser.email,
        first_name: storedUser?.first_name ?? '',
        last_name: storedUser?.last_name ?? ''
      };

      if (displayUsernameEl) {
        const displayName =
          (currentUser.first_name || currentUser.last_name)
            ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
            : currentUser.username;
        displayUsernameEl.textContent = displayName || 'Unnamed user';
      }

      await loadUserPosts();
    } catch (err) {
      console.error('Error initializing profile:', err);
      alert('An error occurred while loading your profile.');
    }
  }

  // ---------- wire up events ----------

  if (editLink) {
    editLink.addEventListener('click', (e) => {
      e.preventDefault();
      startUsernameEdit();
    });
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cancelUsernameEdit();
    });
  }
  if (saveUsernameBtn) {
    saveUsernameBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveUsername();
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closePostModal);
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closePostModal);
  }
  if (savePostBtn) {
    savePostBtn.addEventListener('click', (e) => {
      e.preventDefault();
      savePostEdits();
    });
  }
  if (deletePostBtn) {
    deletePostBtn.addEventListener('click', (e) => {
      e.preventDefault();
      deleteCurrentPost();
    });
  }

  // 🔍 live search: filter profile posts only
  if (searchInput) {
    let t;
    const debounce = (fn, ms = 80) => (...args) => {
      clearTimeout(t); t = setTimeout(() => fn(...args), ms);
    };
    searchInput.addEventListener('input', debounce(applyProfileSearch));
  }

  // kick off
  initProfile();
});


