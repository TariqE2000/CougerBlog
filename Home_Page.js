// Home_Page.js
document.addEventListener('DOMContentLoaded', () => {
  // Buttons & modal
  const postBtn      = document.querySelector('.postBtn');
  const modal        = document.getElementById('postModal');
  const titleInput   = document.getElementById('newPostTitle');
  const authorInput  = document.getElementById('newPostAuthor');
  const editor       = document.getElementById('newPostBody'); // contenteditable
  const saveBtn      = document.getElementById('savePost');
  const cancelBtn    = document.getElementById('cancelPost');

  // Main article targets (to replace)
  const pageTitleEl  = document.querySelector('.postTitle');   // big H1 in header row
  const metaAuthorEl = document.querySelector('.mainPost .postMeta'); // author line
  const bodyEl       = document.querySelector('.mainPost .postBody'); // article container

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

  // --- simple sanitizer: allow only a safe set of tags/attributes ---
  function sanitizeHTML(html) {
    const ALLOWED = new Set(['H1','H2','H3','P','BR','STRONG','EM','B','I','U','UL','OL','LI','A']);
    const TMP = document.createElement('div');
    TMP.innerHTML = html;

    (function walk(node){
      // remove script/style and disallowed nodes
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 1) {
          const tag = child.tagName.toUpperCase();
          if (!ALLOWED.has(tag)) {
            // unwrap node (keep children text)
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          // clean attributes
          [...child.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const val  = attr.value || '';
            // only allow href on <a>, and no javascript:
            if (tag === 'A' && name === 'href' && !/^javascript:/i.test(val)) {
              // ok
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
    // Use execCommand for broad browser support (still works)
    editor.focus();
    document.execCommand('formatBlock', false, tag); // 'h1', 'h2', 'p'
  }
  function applyInline(cmd) {
    editor.focus();
    document.execCommand(cmd); // 'bold', 'italic', 'underline'
  }

  // Wire up toolbar buttons
  document.querySelectorAll('.rte-btn[data-block]').forEach(btn => {
    btn.addEventListener('click', () => applyBlock(btn.dataset.block));
  });
  document.querySelectorAll('.rte-btn[data-inline]').forEach(btn => {
    btn.addEventListener('click', () => applyInline(btn.dataset.inline));
  });

  // --- open modal from Post button ---
  postBtn.addEventListener('click', () => {
    // Clear previous values
    titleInput.value  = '';
    authorInput.value = '';
    editor.innerHTML  = '';  // clear contenteditable
    openModal();
  });

  // --- close actions ---
  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  cancelBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

 // --- publish: update main article + add sidebar card + register with search ---
saveBtn.addEventListener('click', () => {
  const newTitle  = titleInput.value.trim();
  const newAuthor = authorInput.value.trim() || 'Anonymous';
  const rawHTML   = editor.innerHTML.trim();

  const empty = rawHTML.replace(/<br\s*\/?>/gi,'').replace(/&nbsp;/g,'').trim() === '';
  if (!newTitle || empty) {
    alert('Please provide both a Title and Body.');
    return;
  }

  // Sanitize once
  const safe = sanitizeHTML(rawHTML);

  // 1) Update main (center) article
  if (pageTitleEl) pageTitleEl.textContent = newTitle;
  if (metaAuthorEl) metaAuthorEl.textContent = newAuthor;
  if (bodyEl) bodyEl.innerHTML = safe;

  // 2) Create a sidebar card and prepend it
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    // Make a plain-text excerpt from the sanitized HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = safe;
    const plain = tmp.textContent.trim().replace(/\s+/g, ' ');
    const excerpt = plain.length > 180 ? plain.slice(0, 177) + '…' : plain;

    const card = document.createElement('div');
    card.className = 'sidePost newly-added';

    const h3 = document.createElement('h3');
    h3.textContent = newTitle;

    const meta = document.createElement('p');
    meta.className = 'sideMeta';
    meta.textContent = newAuthor;

    const p = document.createElement('p');
    p.textContent = excerpt || '—';

    card.appendChild(h3);
    card.appendChild(meta);
    card.appendChild(p);

    // Click behavior: show this post in the center
    card.addEventListener('click', () => {
      if (pageTitleEl) pageTitleEl.textContent = newTitle;
      if (metaAuthorEl) metaAuthorEl.textContent = newAuthor;
      if (bodyEl) bodyEl.innerHTML = safe;

      document.querySelectorAll('.sidebar .sidePost').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      document.querySelector('.mainPost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    sidebar.prepend(card);

    // 3) Register with live-search and re-apply current filter
    if (window.__homeSearch?.register) window.__homeSearch.register(card);
    if (window.__homeSearch?.apply) window.__homeSearch.apply();
  }

  closeModal();
});

});



// search for posts, through the navbar search on top

// --- Live search filter for Home page ---
(function () {
  const search = document.querySelector('.search-input');
  if (!search) return;

  // Collect searchable items: the main article + each sidebar card
  const items = [];

  // Main article (title + author + all headings/paragraphs)
  const mainPost = document.querySelector('.mainPost');
  if (mainPost) {
    const mainText = [
      document.querySelector('.postTitle')?.textContent || '',
      document.querySelector('.mainPost .postMeta')?.textContent || '',
      ...[...document.querySelectorAll('.mainPost .postBody h2, .mainPost .postBody p')]
        .map(n => n.textContent || '')
    ].join(' ').toLowerCase();

    items.push({ el: mainPost, text: mainText });
  }

  // Sidebar cards
  document.querySelectorAll('.sidebar .sidePost').forEach(card => {
    const text = [
      card.querySelector('h3')?.textContent || '',
      ...[...card.querySelectorAll('p')].map(p => p.textContent || '')
    ].join(' ').toLowerCase();

    items.push({ el: card, text });
  });

  // Optional "no results" message
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

  // Small debounce
  let t = null;
  const debounce = (fn, ms = 80) => (...args) => {
    clearTimeout(t); t = setTimeout(() => fn(...args), ms);
  };

  const applyFilter = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;

    items.forEach(({ el, text }) => {
      const match = !q || text.includes(q);
      el.hidden = !match;   // keeps layout clean and is accessible
      if (match) shown++;
    });

    emptyMsg.style.display = shown === 0 ? 'block' : 'none';
  };

  search.addEventListener('input', debounce(applyFilter));

  // ✅ NEW: expose hooks so newly created cards can join the index
  window.__homeSearch = {
    register(cardEl) {
      const text = [
        cardEl.querySelector('h3')?.textContent || '',
        ...[...cardEl.querySelectorAll('p')].map(p => p.textContent || '')
      ].join(' ').toLowerCase();
      items.push({ el: cardEl, text });
    },
    apply: applyFilter
  };

})();



// --- Click on sidebar post -> show its content in main section ---
(function () {
  const mainTitle  = document.querySelector('.postTitle');
  const mainAuthor = document.querySelector('.mainPost .postMeta');
  const mainBody   = document.querySelector('.mainPost .postBody');

  if (!mainTitle || !mainAuthor || !mainBody) return;

  document.querySelectorAll('.sidebar .sidePost').forEach(card => {
    card.addEventListener('click', () => {
      const title  = card.querySelector('h3')?.textContent.trim() || 'Untitled';
      const author = card.querySelector('.sideMeta')?.textContent.trim() || 'Anonymous';
      const quote  = card.querySelector('p:not(.sideMeta)')?.textContent.trim() || '';

      // Replace main article content
      mainTitle.textContent = title;
      mainAuthor.textContent = author;
      mainBody.innerHTML = `
        <h2>${title}</h2>
        <p>${quote}</p>
      `;

      // Optional: visually indicate which card is active
      document.querySelectorAll('.sidebar .sidePost').forEach(p => p.classList.remove('active'));
      card.classList.add('active');
    });
  });
})();


