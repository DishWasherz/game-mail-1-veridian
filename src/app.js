import emailData from '../data/emails.json';
import { initCredentials, validateLogin } from './credentials.js';
import { loadState, saveState, resetState } from './persistence.js';
import { renderInbox, renderEmailView } from './inbox.js';
import { renderLogin } from './login.js';
import { renderForensics } from './forensics.js';
import { renderBoard } from './board.js';
import { renderCaseFile } from './casefile.js';
import { initAnalytics, trackEvent } from './analytics.js';
import {
  EFB_THRESHOLDS, MISSING_CATEGORIES, AFFAIR_CATEGORIES, GAME_TODAY
} from './config.js';

let state;
let credentials;
let currentView = 'login';

export function getState() { return state; }
export function getCredentials() { return credentials; }
export function getEmailData() { return emailData; }

export function setState(updates) {
  Object.assign(state, updates);
  saveState(state);
}

export function navigate(view, params = {}) {
  currentView = view;
  render(params);
}

export function getCurrentInbox() {
  return state.currentInbox;
}

export function getCurrentFolder() {
  return state.currentFolder || 'inbox';
}

export function setFolder(folder) {
  state.currentFolder = folder;
  saveState(state);
}

export function getEmailsForCurrentFolder() {
  const folder = getCurrentFolder();

  if (state.currentInbox === 'daniel') {
    if (folder === 'sent' || folder === 'drafts') return [];
    let emails = [...emailData.act1];
    if (state.efbDelivered) {
      emails.unshift({ ...emailData.efb, date: GAME_TODAY, _isDynamic: true });
    }
    if (state.finalBatchDelivered) {
      // F1 is shown as forensics popup, only F2 and F3 arrive as emails
      const fb = emailData.finalBatch.slice(1).map((e, i) => ({
        ...e, date: GAME_TODAY, _isDynamic: true, _fbOrder: i
      }));
      emails.unshift(...fb);
    }
    return emails;
  }

  if (state.currentInbox === 'sarah') {
    if (folder === 'sent') {
      return emailData.act2.filter(e => e.from === 'sarahc@gmail.com');
    }
    return emailData.act2.filter(e => e.from !== 'sarahc@gmail.com');
  }

  return [];
}

export function markEmailRead(emailId, inbox) {
  const key = inbox || state.currentInbox;
  if (!state.openedEmails[key]) state.openedEmails[key] = [];
  if (!state.openedEmails[key].includes(emailId)) {
    state.openedEmails[key].push(emailId);
    if (!state.startTime) state.startTime = Date.now();
    saveState(state);

    let eventId;
    if (typeof emailId === 'string' && emailId.startsWith('F')) {
      eventId = emailId;
    } else if (emailId === 'efb') {
      eventId = 'EFB';
    } else {
      eventId = key === 'daniel' ? `A1-${emailId}` : `A2-${emailId}`;
    }

    trackEvent('email_opened', {
      id: eventId,
      account: key,
      folder: state.currentFolder || 'inbox',
      total_opened: state.openedEmails[key].length
    });

    checkEfbTrigger();
  }
}

export function toggleStar(emailId) {
  const key = state.currentInbox;
  if (!state.starredEmails[key]) state.starredEmails[key] = [];
  const idx = state.starredEmails[key].indexOf(emailId);
  if (idx === -1) {
    state.starredEmails[key].push(emailId);
  } else {
    state.starredEmails[key].splice(idx, 1);
  }
  saveState(state);
}

export function isEmailRead(emailId) {
  const key = state.currentInbox;
  return state.openedEmails[key]?.includes(emailId) || false;
}

export function isEmailStarred(emailId) {
  const key = state.currentInbox;
  return state.starredEmails[key]?.includes(emailId) || false;
}

function checkEfbTrigger() {
  if (state.efbDelivered) return;
  if (state.currentInbox !== 'daniel') return;
  if (currentView !== 'inbox') return;

  const opened = state.openedEmails.daniel || [];
  const totalOpened = opened.length;

  const missingOpened = opened.filter(id => {
    const email = emailData.act1.find(e => e.id === id);
    return email && MISSING_CATEGORIES.includes(email.category);
  }).length;

  const affairOpened = opened.filter(id => {
    const email = emailData.act1.find(e => e.id === id);
    return email && AFFAIR_CATEGORIES.includes(email.category);
  }).length;

  if (
    totalOpened >= EFB_THRESHOLDS.totalEmailsOpened &&
    missingOpened >= EFB_THRESHOLDS.missingCategoryOpened &&
    affairOpened >= EFB_THRESHOLDS.affairCategoryOpened
  ) {
    state.efbDelivered = true;
    saveState(state);
    trackEvent('efb_delivered', { total_opened: totalOpened });
    render();
  }
}

export function handleLogin(email, password) {
  const result = validateLogin(email, password, credentials);
  const normalEmail = email.trim().toLowerCase();
  let accountTried = 'unknown';
  if (normalEmail === credentials.daniel.email) accountTried = 'daniel';
  else if (normalEmail === credentials.sarah.email) accountTried = 'sarah';

  trackEvent('login_attempt', { account_tried: accountTried, success: !!result });

  if (result) {
    state.currentInbox = result;
    state.currentFolder = 'inbox';
    saveState(state);
    navigate('inbox');
    return true;
  }
  return false;
}

export function handleLogout() {
  state.currentInbox = null;
  state.currentFolder = 'inbox';
  saveState(state);
  navigate('login');
}

export function doReset() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    trackEvent('investigation_reset');
    resetState();
    location.reload();
  }
}

export function injectPassword(body) {
  return body.replace('[RANDOMIZED]', credentials.sarah.password);
}

export function showCaseFile() {
  const existing = document.querySelector('.case-file-overlay');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.className = 'case-file-overlay';
  overlay.innerHTML = `
    <div class="forensics-card">
      <div class="forensics-header">
        <span class="forensics-badge">METRO PD - DIGITAL FORENSICS UNIT</span>
      </div>
      <div class="forensics-body">
        <p>Hello Detective,</p>
        <p>Case : Sarah Colvin, executive assistant at Veridian Corp. Missing since July 9, no trace, no note, phone dead. The inbox below belongs to Daniel Hartman, her boss, currently our best and only suspect.</p>
        <p>We're in as of this morning, credentials below. One thing: the sent folder and drafts were wiped before we got access. Looks like he cleared them deliberately. Which tells you something already.</p>
        <div class="forensics-creds">
          <div><strong>Email:</strong> ${credentials.daniel.email}</div>
          <div><strong>Password:</strong> ${credentials.daniel.password}</div>
        </div>
        <p>The password is his, by the way. Not one we set. Make of that what you will.</p>
        <p>When you think you have the full picture, put it on the investigation board: the who, the where, the why. The DA won't move on half a theory, so make sure it holds together before you submit.</p>
        <p>Good hunting ;)<br>M., Digital Forensics</p>
      </div>
      <button class="forensics-btn" id="caseFileCloseBtn">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#caseFileCloseBtn').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function render(params = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  switch (currentView) {
    case 'login':
      renderLogin(app);
      break;
    case 'forensics':
      renderForensics(app);
      break;
    case 'inbox':
      renderInbox(app);
      trackEvent('folder_viewed', { account: state.currentInbox, folder: state.currentFolder || 'inbox' });
      if (state.currentInbox === 'daniel' && !state.efbDelivered) {
        checkEfbTrigger();
      }
      break;
    case 'email':
      renderEmailView(app, params.email);
      break;
    case 'board':
      renderBoard(app);
      break;
    case 'casefile':
      renderCaseFile(app);
      break;
  }
}

export function init() {
  credentials = initCredentials();
  state = loadState();
  initAnalytics();

  const fresh = !localStorage.getItem('gm_state');
  trackEvent('session_start', { fresh });

  if (state.currentInbox) {
    navigate('inbox');
  } else {
    navigate('forensics');
  }
}
