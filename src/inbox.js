import {
  navigate, getState, getEmailsForCurrentFolder, getCurrentInbox, getCurrentFolder,
  setFolder, markEmailRead, toggleStar, isEmailRead, isEmailStarred,
  handleLogout, injectPassword, setState, showCaseFile
} from './app.js';
import { GAME_TODAY } from './config.js';
import { trackEvent } from './analytics.js';

let searchTerm = '';
let sortNewest = true;
let showStarredOnly = false;
let scrollPositions = {};

function scrollKey() {
  return `${getCurrentInbox()}_${getCurrentFolder()}`;
}

function parseEmailDate(dateStr) {
  if (dateStr === GAME_TODAY) return new Date(2026, 6, 20);
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = dateStr.trim().split(' ');
  let monthStr, dayStr, yearStr;
  if (parts.length >= 3) {
    monthStr = parts[1];
    dayStr = parts[2].replace(',', '');
    yearStr = parts[3] || '2026';
  } else {
    monthStr = parts[0];
    dayStr = parts[1];
    yearStr = '2026';
  }
  return new Date(parseInt(yearStr), months[monthStr] || 0, parseInt(dayStr) || 1);
}

function matchesSearch(email, query) {
  const q = query.toLowerCase();
  const body = getDisplayBody(email);
  return (
    email.subject.toLowerCase().includes(q) ||
    email.from.toLowerCase().includes(q) ||
    (email.to || '').toLowerCase().includes(q) ||
    (email.cc || '').toLowerCase().includes(q) ||
    body.toLowerCase().includes(q)
  );
}

function getDisplayBody(email) {
  let body = email.body || '';
  if (email.id === 49 && getCurrentInbox() === 'daniel') {
    body = injectPassword(body);
  }
  return body;
}

function updateEmailList(el) {
  const inbox = getCurrentInbox();
  const folder = getCurrentFolder();
  let emails = getEmailsForCurrentFolder();

  if (searchTerm) {
    emails = emails.filter(e => matchesSearch(e, searchTerm));
  }
  if (showStarredOnly) {
    emails = emails.filter(e => isEmailStarred(e.id));
  }
  emails = [...emails].sort((a, b) => {
    const da = parseEmailDate(a.date);
    const db = parseEmailDate(b.date);
    return sortNewest ? db - da : da - db;
  });

  const listEl = el.querySelector('#emailList');
  listEl.innerHTML = '';

  // Empty folder states
  if ((folder === 'sent' || folder === 'drafts') && inbox === 'daniel') {
    listEl.innerHTML = '<div class="empty-state">Recovered: 0 items.</div>';
    return;
  }

  if (emails.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No emails match your search.</div>';
    return;
  }

  for (const email of emails) {
    const read = isEmailRead(email.id);
    const starred = isEmailStarred(email.id);
    const row = document.createElement('div');
    row.className = `email-row ${read ? 'read' : 'unread'}`;
    row.setAttribute('data-email-id', email.id);

    const isSent = folder === 'sent';
    let displayFrom;
    if (isSent) {
      displayFrom = `To: ${email.to || ''}`;
    } else {
      displayFrom = email.from;
    }
    const displayDate = email.date.replace(/^[A-Z][a-z]{2}\s/, '');

    const isNewFb = email._isDynamic && typeof email.id === 'string' && email.id.startsWith('F') && !read;
    row.innerHTML = `
      <button class="star-btn ${starred ? 'starred' : ''}" data-id="${email.id}">&#9733;</button>
      <div class="email-row-from">${displayFrom}</div>
      <div class="email-row-subject" data-from="${displayFrom} -">${isNewFb ? '<span class="new-chip">NEW</span> ' : ''}${email.subject}</div>
      <div class="email-row-date">${displayDate}</div>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('star-btn')) return;
      scrollPositions[scrollKey()] = el.querySelector('#emailList')?.parentElement?.scrollTop || 0;
      markEmailRead(email.id, inbox);
      navigate('email', { email });
    });

    row.querySelector('.star-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStar(email.id);
      updateEmailList(el);
    });

    listEl.appendChild(row);
  }
}

function getFolderTabs(inbox) {
  if (inbox === 'daniel') {
    return [
      { id: 'inbox', label: 'Inbox' },
      { id: 'sent', label: 'Sent' },
      { id: 'drafts', label: 'Drafts' }
    ];
  }
  return [
    { id: 'inbox', label: 'Inbox' },
    { id: 'sent', label: 'Sent' }
  ];
}

export function renderInbox(container) {
  const state = getState();
  const inbox = getCurrentInbox();
  const folder = getCurrentFolder();
  const accountEmail = inbox === 'daniel' ? 'd.hartman@veridian-corp.com' : 'sarahc@gmail.com';
  const folders = getFolderTabs(inbox);

  const el = document.createElement('div');
  el.className = 'inbox-screen';

  const folderTabsHtml = folders.map(f =>
    `<button class="folder-tab ${f.id === folder ? 'active' : ''}" data-folder="${f.id}">${f.label}</button>`
  ).join('');

  el.innerHTML = `
    <header class="inbox-header">
      <div class="inbox-header-left">
        <div class="inbox-logo">V</div>
        <h1 class="inbox-title">Veridian Webmail</h1>
      </div>
      <div class="inbox-header-right">
        <span class="inbox-user">${accountEmail}</span>
        <button class="header-btn" id="boardBtn" title="Investigation Board">Board</button>
        <button class="header-btn" id="caseFileBtn" title="Case File">Case</button>
        ${state.caseFileSeen ? '<button class="header-btn" id="caseFileEndBtn" title="Case File">File</button>' : ''}
        <button class="header-btn" id="logoutBtn">Sign Out</button>
      </div>
    </header>
    ${(state.caseClosed && !state.caseFileSeen) ? '<div class="case-closed-banner" id="caseClosedBanner">Investigation closed. View the case file.</div>' : ''}
    <div class="folder-tabs">${folderTabsHtml}</div>
    <div class="inbox-toolbar">
      <input type="text" class="inbox-search" id="inboxSearch" placeholder="Search emails..." value="${searchTerm}">
      <button class="toolbar-btn ${showStarredOnly ? 'active' : ''}" id="starFilterBtn">Starred</button>
      <button class="toolbar-btn" id="sortBtn">${sortNewest ? 'Newest first' : 'Oldest first'}</button>
    </div>
    ${(state.efbDelivered && !isEmailRead('efb') && inbox === 'daniel' && folder === 'inbox') ? '<div class="new-message-banner" id="newMsgBanner">1 new message</div>' : ''}
    <div class="inbox-scroll-container" id="inboxScrollContainer">
      <div class="email-list" id="emailList"></div>
      ${folder === 'inbox' ? '<div class="archive-msg">Older conversations have been archived.</div>' : ''}
    </div>
  `;

  container.appendChild(el);

  updateEmailList(el);

  // Restore scroll position
  const savedScroll = scrollPositions[scrollKey()] || 0;
  const scrollContainer = el.querySelector('#inboxScrollContainer');
  if (scrollContainer && savedScroll) {
    scrollContainer.scrollTop = savedScroll;
  }

  // New message banner click
  const banner = el.querySelector('#newMsgBanner');
  if (banner) {
    banner.addEventListener('click', () => {
      const efbRow = el.querySelector('[data-email-id="efb"]');
      if (efbRow) {
        efbRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        efbRow.classList.add('email-row-highlight');
        setTimeout(() => efbRow.classList.remove('email-row-highlight'), 1500);
      }
    });
  }

  // Case closed banner
  const closedBanner = el.querySelector('#caseClosedBanner');
  if (closedBanner) {
    closedBanner.addEventListener('click', () => {
      setState({ caseFileSeen: true });
      navigate('casefile');
    });
  }

  // Folder tabs
  el.querySelectorAll('.folder-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setFolder(tab.dataset.folder);
      searchTerm = '';
      showStarredOnly = false;
      navigate('inbox');
    });
  });

  // Event listeners
  el.querySelector('#inboxSearch').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    updateEmailList(el);
  });

  el.querySelector('#sortBtn').addEventListener('click', () => {
    sortNewest = !sortNewest;
    el.querySelector('#sortBtn').textContent = sortNewest ? 'Newest first' : 'Oldest first';
    updateEmailList(el);
  });

  el.querySelector('#starFilterBtn').addEventListener('click', () => {
    showStarredOnly = !showStarredOnly;
    el.querySelector('#starFilterBtn').classList.toggle('active', showStarredOnly);
    updateEmailList(el);
  });

  el.querySelector('#logoutBtn').addEventListener('click', handleLogout);

  const caseFileEndBtn = el.querySelector('#caseFileEndBtn');
  if (caseFileEndBtn) {
    caseFileEndBtn.addEventListener('click', () => navigate('casefile'));
  }

  el.querySelector('#boardBtn').addEventListener('click', () => {
    navigate('board');
  });

  el.querySelector('#caseFileBtn').addEventListener('click', showCaseFile);
}

export function renderEmailView(container, email) {
  if (!email) { navigate('inbox'); return; }

  const body = getDisplayBody(email);
  const inbox = getCurrentInbox();
  const folder = getCurrentFolder();

  const el = document.createElement('div');
  el.className = 'email-view-screen';

  let metaHtml = `<div class="email-meta-from"><strong>From:</strong> ${email.from}</div>`;
  metaHtml += `<div class="email-meta-to"><strong>To:</strong> ${email.to || (inbox === 'daniel' ? 'Daniel Hartman' : 'sarahc@gmail.com')}</div>`;
  if (email.cc) {
    metaHtml += `<div class="email-meta-cc"><strong>CC:</strong> ${email.cc}</div>`;
  }
  metaHtml += `<div class="email-meta-date"><strong>Date:</strong> ${email.date}</div>`;

  el.innerHTML = `
    <header class="inbox-header">
      <div class="inbox-header-left">
        <button class="header-btn" id="backBtn">&larr; Back</button>
      </div>
      <div class="inbox-header-right">
        <button class="header-btn" id="boardBtnEmail" title="Investigation Board">Board</button>
        <button class="header-btn" id="caseFileBtnEmail" title="Case File">Case</button>
      </div>
    </header>
    <div class="email-view">
      <div class="email-view-top">
        <div class="email-view-top-left">
          <h2 class="email-view-subject">${email.subject}</h2>
          <div class="email-view-meta">${metaHtml}</div>
        </div>
        <button class="email-view-star ${isEmailStarred(email.id) ? 'starred' : ''}" id="starBtnEmail">
          <span class="email-view-star-icon">&#9733;</span>
          <span class="email-view-star-label">Mark as starred</span>
        </button>
      </div>
      <div class="email-view-body">${formatBody(body)}</div>
    </div>
  `;

  container.appendChild(el);

  el.querySelector('#backBtn').addEventListener('click', () => {
    navigate('inbox');
  });

  el.querySelector('#boardBtnEmail').addEventListener('click', () => {
    navigate('board');
  });

  el.querySelector('#caseFileBtnEmail').addEventListener('click', showCaseFile);

  el.querySelector('#starBtnEmail').addEventListener('click', () => {
    toggleStar(email.id);
    const btn = el.querySelector('#starBtnEmail');
    btn.classList.toggle('starred', isEmailStarred(email.id));
  });

  const onEscape = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', onEscape);
      navigate('inbox');
    }
  };
  document.addEventListener('keydown', onEscape);

  // Check for final batch completion
  if (email._isDynamic && email.id && typeof email.id === 'string' && email.id.startsWith('F')) {
    const state = getState();
    if (!state.finalBatchRead.includes(email.id)) {
      state.finalBatchRead.push(email.id);
      setState({ finalBatchRead: state.finalBatchRead });
      checkCaseClosed();
    }
  }
}

function checkCaseClosed() {
  const state = getState();
  if (state.caseClosed) return;
  const allFbRead = ['F2', 'F3'].every(id => state.finalBatchRead.includes(id));
  if (allFbRead) {
    const endTime = Date.now();
    const duration = state.startTime ? endTime - state.startTime : 0;
    const bestTime = state.bestTime ? Math.min(state.bestTime, duration) : duration;
    setState({ caseClosed: true, endTime, bestTime });
    trackEvent('case_closed', {});
  }
}

function formatBody(body) {
  let html = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  html = html.replace(
    /(---------- Forwarded message ----------[\s\S]*)/,
    '<div class="forwarded-section">$1</div>'
  );

  return html;
}
