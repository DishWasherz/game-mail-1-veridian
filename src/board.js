import {
  navigate, getState, setState, getEmailData
} from './app.js';
import {
  BOARD_DROPDOWN_THRESHOLD, BOARD_COOLDOWN_MS,
  BOARD_OPTIONS, BOARD_KEYWORDS
} from './config.js';
import { trackEvent } from './analytics.js';

let dropdownsTracked = false;

function shouldShowDropdowns() {
  const state = getState();
  const sarahOpened = state.openedEmails.sarah?.length || 0;
  return sarahOpened >= BOARD_DROPDOWN_THRESHOLD;
}

function normalize(text) {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function checkField(field, value) {
  const normalized = normalize(value);
  if (!normalized) return false;
  const keywords = BOARD_KEYWORDS[field];

  if (keywords.fail && keywords.fail.length > 0 && keywords.fail.some(term => normalized.includes(term))) return false;

  // Location requires both a club term AND a space term
  if (keywords.club) {
    const hasClub = keywords.club.some(term => normalized.includes(term));
    const hasSpace = keywords.space.some(term => normalized.includes(term));
    return hasClub && hasSpace;
  }

  return keywords.pass.some(term => normalized.includes(term));
}

function checkAllAnswers(killer, location, motive) {
  return checkField('killer', killer) &&
    checkField('location', location) &&
    checkField('motive', motive);
}

let cooldownInterval = null;

export function renderBoard(container) {
  const state = getState();
  const useDropdowns = shouldShowDropdowns();
  const cooldownActive = Date.now() - state.lastBoardSubmit < BOARD_COOLDOWN_MS;

  trackEvent('board_viewed', {});

  if (useDropdowns && !dropdownsTracked && !state.dropdownsUnlocked) {
    dropdownsTracked = true;
    setState({ dropdownsUnlocked: true });
    trackEvent('dropdowns_unlocked', { total_opened_act2: state.openedEmails.sarah?.length || 0 });
  }

  let boardClass = '';
  if (state.boardCorrect) boardClass = 'board-correct';

  const el = document.createElement('div');
  el.className = 'board-screen';
  el.innerHTML = `
    <header class="inbox-header">
      <div class="inbox-header-left">
        <button class="header-btn" id="boardBackBtn">&larr; Back to inbox</button>
      </div>
      <div class="inbox-header-right">
        <span class="board-badge">Metro PD - Investigation Board</span>
      </div>
    </header>
    <div class="board-container ${boardClass}">
      ${state.caseClosed ? '<div class="board-closed">Case closed.</div>' : ''}
      <div class="board-fields">
        <div class="board-field">
          <label>Killer</label>
          ${renderField('killer', state.boardState.killer, useDropdowns)}
        </div>
        <div class="board-field">
          <label>Location</label>
          ${renderField('location', state.boardState.location, useDropdowns)}
        </div>
        <div class="board-field">
          <label>Motive</label>
          ${renderField('motive', state.boardState.motive, useDropdowns)}
        </div>
      </div>
      <div class="board-actions">
        <button class="board-submit-btn" id="boardSubmitBtn" ${cooldownActive || state.boardCorrect ? 'disabled' : ''}>
          ${state.boardCorrect ? 'Correct' : 'Submit'}
        </button>
      </div>
      <div class="board-cooldown-msg" id="boardCooldownMsg" style="${cooldownActive && !state.boardCorrect ? '' : 'display:none'}">
        <p class="board-cooldown-text">The DA needs more than that. Take another look before you resubmit.</p>
        <p class="board-cooldown-timer" id="cooldownTimer"></p>
      </div>
    </div>
  `;

  container.appendChild(el);

  el.querySelector('#boardBackBtn').addEventListener('click', () => {
    if (state.currentInbox) {
      navigate('inbox');
    } else {
      navigate('login');
    }
  });

  if (!state.boardCorrect) {
    const submitBtn = el.querySelector('#boardSubmitBtn');
    submitBtn.addEventListener('click', () => handleSubmit(el));

    el.querySelectorAll('.board-input, .board-select').forEach(input => {
      input.addEventListener('input', () => saveFieldState(el));
      input.addEventListener('change', (e) => {
        saveFieldState(el);
        if (e.target.classList.contains('board-select')) {
          navigate('board');
        }
      });
    });
  }

  if (cooldownActive && !state.boardCorrect) {
    startCooldownTimer(el, state.lastBoardSubmit);
  }
}

function renderField(field, value, useDropdowns) {
  if (!useDropdowns) {
    return `<input type="text" class="board-input" data-field="${field}" value="${escapeHtml(value)}" placeholder="Enter your answer...">`;
  }

  const options = BOARD_OPTIONS[field];
  const isOther = value && !options.includes(value);

  let html = `<select class="board-select" data-field="${field}">`;
  html += `<option value="">Select...</option>`;
  for (const opt of options) {
    html += `<option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`;
  }
  html += `<option value="__other__" ${isOther ? 'selected' : ''}>Other</option>`;
  html += `</select>`;

  if (isOther) {
    html += `<input type="text" class="board-input board-other" data-field="${field}" value="${escapeHtml(value)}" placeholder="Enter your answer...">`;
  }

  return html;
}

function saveFieldState(el) {
  const state = getState();
  const fields = { killer: '', location: '', motive: '' };

  for (const field of ['killer', 'location', 'motive']) {
    const select = el.querySelector(`.board-select[data-field="${field}"]`);
    const input = el.querySelector(`.board-input[data-field="${field}"]`);

    if (select) {
      const val = select.value;
      if (val === '__other__') {
        const otherInput = el.querySelector(`.board-other[data-field="${field}"]`);
        fields[field] = otherInput?.value || '';
      } else {
        fields[field] = val;
      }
    } else if (input) {
      fields[field] = input.value;
    }
  }

  setState({ boardState: fields });
}

function handleSubmit(el) {
  saveFieldState(el);
  const state = getState();
  const { killer, location, motive } = state.boardState;

  if (!killer || !location || !motive) return;

  const state2 = getState();
  setState({ lastBoardSubmit: Date.now(), boardSubmissions: (state2.boardSubmissions || 0) + 1 });

  const killerOk = checkField('killer', killer);
  const locationOk = checkField('location', location);
  const motiveOk = checkField('motive', motive);
  const correct = killerOk && locationOk && motiveOk;
  const useDropdowns = shouldShowDropdowns();
  const mode = useDropdowns ? 'dropdown' : 'freetext';

  const eventProps = {
    mode,
    correct,
    killer_ok: killerOk,
    location_ok: locationOk,
    motive_ok: motiveOk
  };

  if (mode === 'freetext' && !correct) {
    eventProps.killer_raw = killer;
    eventProps.location_raw = location;
    eventProps.motive_raw = motive;
  }

  trackEvent('board_submit', eventProps);

  if (correct) {
    setState({ boardCorrect: true, finalBatchDelivered: true, currentInbox: 'daniel', currentFolder: 'inbox' });
    showClosingForensicsPopup();
  } else {
    // Show cooldown inline without full re-render
    const btn = el.querySelector('#boardSubmitBtn');
    const msgEl = el.querySelector('#boardCooldownMsg');
    btn.disabled = true;
    msgEl.style.display = '';
    startCooldownTimer(el, state.lastBoardSubmit);
  }
}

function startCooldownTimer(el, lastSubmit) {
  if (cooldownInterval) clearInterval(cooldownInterval);

  function update() {
    const remaining = Math.max(0, BOARD_COOLDOWN_MS - (Date.now() - lastSubmit));
    const timerEl = el.querySelector('#cooldownTimer');
    const btn = el.querySelector('#boardSubmitBtn');
    const msgEl = el.querySelector('#boardCooldownMsg');

    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      if (timerEl) timerEl.textContent = '';
      if (msgEl) msgEl.style.display = 'none';
      if (btn) btn.disabled = false;
    } else if (timerEl) {
      const secs = Math.ceil(remaining / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      timerEl.textContent = `You can resubmit in ${m}:${String(s).padStart(2, '0')}`;
    }
  }

  update();
  cooldownInterval = setInterval(update, 1000);
}

function showClosingForensicsPopup() {
  trackEvent('ending_popup_shown', {});
  const f1 = getEmailData().finalBatch[0];
  const body = (f1?.body || '').replace(/\n/g, '<br>');

  const overlay = document.createElement('div');
  overlay.className = 'case-file-overlay';
  overlay.innerHTML = `
    <div class="forensics-card">
      <div class="forensics-header">
        <span class="forensics-badge">METRO PD - DIGITAL FORENSICS UNIT</span>
      </div>
      <div class="forensics-body">
        <p>${body}</p>
      </div>
      <button class="forensics-btn" id="closingForensicsBtn">Back to the inbox</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#closingForensicsBtn').addEventListener('click', () => {
    overlay.remove();
    showNewEmailNotification();
  });
}

function showNewEmailNotification() {
  const overlay = document.createElement('div');
  overlay.className = 'new-email-popup-overlay';
  overlay.innerHTML = `
    <div class="new-email-popup">
      <div class="new-email-popup-icon">&#9993;</div>
      <p class="new-email-popup-text">New email for Daniel Hartman</p>
      <button class="new-email-popup-btn" id="openInboxBtn">Open inbox</button>
      <button class="new-email-popup-dismiss" id="dismissPopupBtn">Dismiss</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#openInboxBtn').addEventListener('click', () => {
    overlay.remove();
    navigate('inbox');
  });

  overlay.querySelector('#dismissPopupBtn').addEventListener('click', () => {
    overlay.remove();
    navigate('board');
  });
}

function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
