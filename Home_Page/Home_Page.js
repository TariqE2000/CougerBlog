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

  // --- publish & replace the main article ---
  saveBtn.addEventListener('click', () => {
    const newTitle  = titleInput.value.trim();
    const newAuthor = authorInput.value.trim() || 'Anonymous';
    const rawHTML   = editor.innerHTML.trim();

    // Strip empty <p><br></p> etc.
    const empty = rawHTML.replace(/<br\s*\/?>/gi,'').replace(/&nbsp;/g,'').trim() === '';

    if (!newTitle || empty) {
      alert('Please provide both a Title and Body.');
      return;
    }

    // Replace title (H1 in header row)
    if (pageTitleEl) pageTitleEl.textContent = newTitle;

    // Replace author meta
    if (metaAuthorEl) metaAuthorEl.textContent = newAuthor;

    // Sanitize and inject body
    const safe = sanitizeHTML(rawHTML);
    if (bodyEl) bodyEl.innerHTML = safe;

    closeModal();
  });
});



