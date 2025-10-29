// ---- Username inline edit ----
const editButton = document.getElementById("edit-username");
const usernameDisplay = document.getElementById("display-username");
const editControls = document.getElementById("edit-controls");
const usernameInput = document.getElementById("username-input");
const saveButton = document.getElementById("save-username");
const cancelButton = document.getElementById("cancel-edit");

editButton.addEventListener("click", (e) => {
  e.preventDefault();
  usernameInput.value = usernameDisplay.textContent;
  usernameDisplay.style.display = "none";
  editButton.style.display = "none";
  editControls.style.display = "block";
});

saveButton.addEventListener("click", () => {
  usernameDisplay.textContent = usernameInput.value || "Untitled";
  usernameDisplay.style.display = "block";
  editControls.style.display = "none";
  editButton.style.display = "inline-block";
});

cancelButton.addEventListener("click", () => {
  usernameDisplay.style.display = "block";
  editControls.style.display = "none";
  editButton.style.display = "inline-block";
});

// ---- Post edit modal ----
(function () {
  const modal = document.getElementById('post-modal');
  const titleInput = document.getElementById('edit-title');
  const bodyInput  = document.getElementById('edit-body');
  const saveBtn    = document.getElementById('save-post');
  const delBtn     = document.getElementById('delete-post');

  // formatting buttons
  let currentType = 'paragraph';
  const formatButtons = document.querySelectorAll('.format-btn');

  function setFormat(type) {
    currentType = type;
    formatButtons.forEach(b => {
      const active = b.dataset.type === type;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (type === 'title') {
      bodyInput.classList.add('title-style');
      bodyInput.classList.remove('paragraph-style');
    } else {
      bodyInput.classList.remove('title-style');
      bodyInput.classList.add('paragraph-style');
    }
  }
  formatButtons.forEach(btn => btn.addEventListener('click', () => setFormat(btn.dataset.type)));

  let currentCard  = null;

  function openModal(card) {
    currentCard = card;
    const titleEl = card.querySelector('.post-card-title');
    const bodyEl  = card.querySelector('.post-card-body p');

    titleInput.value = titleEl ? titleEl.textContent.trim() : '';
    bodyInput.value  = bodyEl ? bodyEl.textContent.trim() : '';

    const isTitle = bodyEl && bodyEl.classList.contains('title-style');
    setFormat(isTitle ? 'title' : 'paragraph');

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => titleInput.focus(), 0);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    currentCard = null;
  }

  // Open modal on post click
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.post-card');
    if (card && !e.target.closest('.modal')) openModal(card);
  });

  // Save edits
  saveBtn.addEventListener('click', () => {
    if (!currentCard) return;
    const titleEl = currentCard.querySelector('.post-card-title');
    const bodyEl  = currentCard.querySelector('.post-card-body p');

    if (titleEl) titleEl.textContent = titleInput.value || 'Untitled';
    if (bodyEl)  {
      bodyEl.textContent = bodyInput.value || '';
      bodyEl.classList.toggle('title-style', currentType === 'title');
      bodyEl.classList.toggle('paragraph-style', currentType !== 'title');
    }

    closeModal();
  });

  // Delete
  delBtn.addEventListener('click', () => {
    if (!currentCard) return;
    currentCard.remove();
    closeModal();
  });

  // Close modal
  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();
