// Home_Page.js

const API_URL = './api.php';

// store posts loaded from backend so we have full content on click
let loadedPosts = [];

document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const postBtn         = document.querySelector('.postBtn');
  const modal           = document.getElementById('postModal');
  const titleInput      = document.getElementById('newPostTitle');
  const authorInput     = document.getElementById('newPostAuthor');
  const editor          = document.getElementById('newPostBody');
  const saveBtn         = document.getElementById('savePost');
  const cancelBtn       = document.getElementById('cancelPost');

  const pageTitleEl     = document.querySelector('.postTitle');
  const metaAuthorEl    = document.querySelector('.mainPost .postMeta');
  const bodyEl          = document.querySelector('.mainPost .postBody');
  const mainPostSection = document.querySelector('.mainPost');
  const sidebar         = document.querySelector('.sidebar');

  // --- current logged-in user (from LoginPage.js) ---
  let currentUser = null;
  try {
    currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
  } catch (_) {
    currentUser = null;
  }

  if (currentUser && authorInput) {
    authorInput.value = currentUser.username || currentUser.email || '';
  }

  // --- modal helpers ---
  const openModal = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => titleInput.focus(), 0);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  // --- simple sanitizer ---
  function sanitizeHTML(html) {
    const ALLOWED = new Set([
      'H1','H2','H3','P','BR','STRONG','EM','B','I','U','UL','OL','LI','A'
    ]);
    const TMP = document.createElement('div');
    TMP.innerHTML = html;

    (function walk(node){
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 1) {
          const tag = child.tagName.toUpperCase();
          if (!ALLOWED.has(tag)) {
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          [...child.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const val  = attr.value || '';
            if (tag === 'A' && name === 'href' && !/^javascript:/i.test(val)) {
              // allowed
            } else {
              child.removeAttribute(attr.name);
            }
          });
          walk(child);
        }
      });
    })(TMP);

    return TMP.innerHTML;
  }

  // --- toolbar actions ---
  function applyBlock(tag) {
    editor.focus();
    document.execCommand('formatBlock', false, tag);
  }
  function applyInline(cmd) {
    editor.focus();
    document.execCommand(cmd);
  }

  document.querySelectorAll('.rte-btn[data-block]').forEach(btn => {
    btn.addEventListener('click', () => applyBlock(btn.dataset.block));
  });
  document.querySelectorAll('.rte-btn[data-inline]').forEach(btn => {
    btn.addEventListener('click', () => applyInline(btn.dataset.inline));
  });

  // --- open modal from Post button ---
  postBtn.addEventListener('click', () => {
    titleInput.value  = '';
    authorInput.value = currentUser?.username || currentUser?.email || '';
    editor.innerHTML  = '';
    openModal();
  });

  // --- close modal ---
  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  cancelBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // --- show a post in the main section ---
  function showPostInMain(post) {
    if (!pageTitleEl || !metaAuthorEl || !bodyEl) return;

    if (mainPostSection) mainPostSection.hidden = false;

    const title   = post.title || 'Untitled';
    const author  = post.username || 'Anonymous';
    const content = post.content || '';

    pageTitleEl.textContent  = title;
    metaAuthorEl.textContent = author;

    bodyEl.innerHTML = '';

    const h2 = document.createElement('h2');
    h2.textContent = title;

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content;

    bodyEl.appendChild(h2);
    bodyEl.appendChild(contentDiv);
  }

  function findPostById(id) {
    return loadedPosts.find(p => String(p.id ?? p.post_id) === String(id));
  }

  // --- attach click behavior to sidebar card ---
  function attachCardClick(cardEl) {
    cardEl.addEventListener('click', () => {
      const postId = cardEl.dataset.postId;
      const post = findPostById(postId);
      if (!post) return;

      showPostInMain(post);

      document
        .querySelectorAll('.sidebar .sidePost')
        .forEach(c => c.classList.remove('active'));
      cardEl.classList.add('active');

      document
        .querySelector('.mainPost')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- create a sidebar card (uses preview text only) ---
  function createSidebarCard(post) {
    if (!sidebar) return null;

    const card = document.createElement('div');
    card.className = 'sidePost';
    card.dataset.postId = post.id ?? post.post_id ?? '';

    const h3 = document.createElement('h3');
    h3.textContent = post.title || 'Untitled';

    const meta = document.createElement('p');
    meta.className = 'sideMeta';
    meta.textContent = post.username || 'Anonymous';

    const p = document.createElement('p');
    const tmp = document.createElement('div');
    tmp.innerHTML = post.content || '';
    const plain = tmp.textContent.trim().replace(/\s+/g, ' ');
    p.textContent = plain.length > 180 ? plain.slice(0, 177) + '…' : plain || '—';

    card.appendChild(h3);
    card.appendChild(meta);
    card.appendChild(p);

    attachCardClick(card);
    sidebar.appendChild(card);

    if (window.__homeSearch?.register) {
      window.__homeSearch.register(card);
    }

    return card;
  }

  // --- publish: send to API + update UI ---
  saveBtn.addEventListener('click', async () => {
    const newTitle  = titleInput.value.trim();
    const newAuthor = authorInput.value.trim() || (currentUser?.username || 'Anonymous');
    const rawHTML   = editor.innerHTML.trim();

    const empty = rawHTML
      .replace(/<br\s*\/?>/gi,'')
      .replace(/&nbsp;/g,'')
      .trim() === '';

    if (!newTitle || empty) {
      alert('Please provide both a Title and Body.');
      return;
    }

    if (!currentUser) {
      alert('You must be logged in to create a post.');
      window.location.href = 'LoginPage.html';
      return;
    }

    const safe = sanitizeHTML(rawHTML);

    try {
      const resp = await fetch(`${API_URL}?action=create-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          body: safe
        })
      });

      if (!resp.ok) {
        console.error('Create post failed with status', resp.status);
        alert('Failed to create post. Please try again.');
        return;
      }

      const result = await resp.json();
      if (!result.success) {
        if (result.message === 'Unauthorized') {
          alert('Your session expired. Please log in again.');
          window.location.href = 'LoginPage.html';
        } else {
          alert(result.message || 'Failed to create post.');
        }
        return;
      }

      const data = result.data || {};
      const post = {
        id: data.post_id || null,
        username: data.username || newAuthor,
        title: newTitle,
        content: safe,
        created_at: data.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      // add to front of global list
      loadedPosts.unshift(post);

      showPostInMain(post);

      if (sidebar) {
        const card = createSidebarCard(post);
        if (card) {
          // newest at top of sidebar
          sidebar.insertBefore(card, sidebar.firstChild);
          document
            .querySelectorAll('.sidebar .sidePost')
            .forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        }
      }

      if (window.__homeSearch?.apply) {
        window.__homeSearch.apply();
      }

      closeModal();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('An error occurred while creating the post.');
    }
  });

  // --- load posts from backend: GLOBAL FEED, MOST RECENT FIRST ---
  async function loadPostsFromAPI() {
    if (!pageTitleEl || !bodyEl || !sidebar) return;

    if (mainPostSection) mainPostSection.hidden = false;

    sidebar.innerHTML = '';
    bodyEl.innerHTML = '';
    pageTitleEl.textContent = 'Loading posts...';
    metaAuthorEl.textContent = '';

    try {
      const resp = await fetch(`${API_URL}?action=get-home-posts`);
      if (!resp.ok) {
        console.error('Failed to load posts:', resp.status);
        pageTitleEl.textContent = 'Error loading posts';
        bodyEl.innerHTML = '<p>Please try again later.</p>';
        return;
      }

      const result = await resp.json();
      let posts = (result.success && result.data && Array.isArray(result.data.posts))
        ? result.data.posts
        : [];

      // ✅ GLOBAL FEED: do NOT filter by currentUser
      // Sort by created_at DESC (newest first)
      posts.sort((a, b) => {
        const da = new Date((a.created_at || '').replace(' ', 'T'));
        const db = new Date((b.created_at || '').replace(' ', 'T'));
        return db - da;
      });

      loadedPosts = posts;

      if (!posts.length) {
        pageTitleEl.textContent = 'No posts yet';
        bodyEl.innerHTML = '<p>Be the first to create a post using the Post button.</p>';
        return;
      }

      // Show the most recent post in the main section
      showPostInMain(posts[0]);

      // Build sidebar cards for all posts (already sorted newest→oldest)
      posts.forEach(post => {
        createSidebarCard(post);
      });
    } catch (err) {
      console.error('Error loading posts:', err);
      pageTitleEl.textContent = 'Error loading posts';
      bodyEl.innerHTML = '<p>Could not load posts. Check console for details.</p>';
    }
  }

  loadPostsFromAPI();
});


// --- Live search: ONLY affects sidebar cards, NOT the main article ---
(function () {
  const search  = document.querySelector('.search-input');
  const sidebar = document.querySelector('.sidebar');
  if (!search || !sidebar) return;

  const items = [];

  function indexExistingCards() {
    items.length = 0;
    sidebar.querySelectorAll('.sidePost').forEach(card => {
      const text = [
        card.querySelector('h3')?.textContent || '',
        ...card.querySelectorAll('p')
      ].map(p => p.textContent || '').join(' ').toLowerCase();
      items.push({ el: card, text });
    });
  }

  indexExistingCards();

  let emptyMsg = document.getElementById('no-results-home');
  if (!emptyMsg) {
    emptyMsg = document.createElement('div');
    emptyMsg.id = 'no-results-home';
    emptyMsg.textContent = 'No posts match your search.';
    emptyMsg.style.display = 'none';
    emptyMsg.style.color = '#cbd5e1';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.margin = '16px 0';
    document.querySelector('.content')?.appendChild(emptyMsg);
  }

  let t = null;
  const debounce = (fn, ms = 80) => (...args) => {
    clearTimeout(t); t = setTimeout(() => fn(...args), ms);
  };

  const applyFilter = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;

    items.forEach(({ el, text }) => {
      const match = !q || text.includes(q);
      el.hidden = !match;
      if (match) shown++;
    });

    emptyMsg.style.display = shown === 0 ? 'block' : 'none';
  };

  search.addEventListener('input', debounce(applyFilter));

  // let JS that creates new cards add them to the index
  window.__homeSearch = {
    register(cardEl) {
      const text = [
        cardEl.querySelector('h3')?.textContent || '',
        ...cardEl.querySelectorAll('p')
      ].map(p => p.textContent || '').join(' ').toLowerCase();
      items.push({ el: cardEl, text });
    },
    apply: applyFilter
  };
})();







