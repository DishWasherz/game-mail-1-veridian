import { navigate, getState, getEmailData, doReset } from './app.js';
import { TALLY_PLAYTEST_URL, TALLY_CASE02_URL, GAME_URL } from './config.js';

function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}m`;
}

function getTotalEmailCount() {
  const data = getEmailData();
  return data.act1.length + data.act2.length;
}

export function renderCaseFile(container) {
  const state = getState();
  const data = getEmailData();

  const totalEmails = getTotalEmailCount();
  const emailsRead = (state.openedEmails.daniel?.length || 0) + (state.openedEmails.sarah?.length || 0);
  const submissions = state.boardSubmissions || 0;
  const duration = state.endTime && state.startTime ? state.endTime - state.startTime : 0;
  const bestTime = state.bestTime || duration;
  const durationStr = formatDuration(duration);
  const bestTimeStr = formatDuration(bestTime);

  const shareText = `I closed Case 01 in ${durationStr}. ${emailsRead} emails read, ${submissions} submission${submissions !== 1 ? 's' : ''}.`;

  const el = document.createElement('div');
  el.className = 'casefile-screen';
  el.innerHTML = `
    <header class="inbox-header">
      <div class="inbox-header-left">
        <button class="header-btn" id="casefileBackBtn">&larr; Back to inbox</button>
      </div>
      <div class="inbox-header-right">
        <span class="board-badge">Case File</span>
      </div>
    </header>
    <div class="casefile-container">
      <div class="casefile-folder">
        <div class="casefile-folder-header">
          <span class="casefile-folder-title">Case 01</span>
          <span class="casefile-stamp stamp-closed">CLOSED</span>
        </div>
        <div class="casefile-folder-body">
          <div class="casefile-stats">
            <div class="casefile-stat"><span class="casefile-stat-value">${emailsRead}</span> of ${totalEmails} emails read</div>
            <div class="casefile-stat"><span class="casefile-stat-value">${submissions}</span> board submission${submissions !== 1 ? 's' : ''}</div>
            <div class="casefile-stat"><span class="casefile-stat-value">${durationStr}</span> total investigation time</div>
          </div>
          <p class="casefile-epilogue">The archive recovered from the basement references other companies. Another case for another day.</p>
          <div class="casefile-actions">
            <p class="casefile-credits">Game Mail, Case 01.</p>
            <a href="${TALLY_PLAYTEST_URL}" target="_blank" class="casefile-link">Give feedback</a>
            <button class="casefile-link" id="shareBtn">Share</button>
            <div class="casefile-reset">
              <button class="casefile-link casefile-reset-btn" id="resetBtn">Reopen the case</button>
              ${bestTime ? `<span class="casefile-best-time">Best: ${bestTimeStr}. Think you can close it faster?</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="casefile-folder">
        <div class="casefile-folder-header">
          <span class="casefile-folder-title">Case 02</span>
          <span class="casefile-stamp stamp-pending">PENDING</span>
        </div>
        <div class="casefile-folder-body">
          <p class="casefile-pending-text">Another investigation will open.</p>
          <a href="${TALLY_CASE02_URL}" target="_blank" class="casefile-link">Get notified</a>
        </div>
      </div>
    </div>
  `;

  container.appendChild(el);

  el.querySelector('#casefileBackBtn').addEventListener('click', () => {
    navigate('inbox');
  });

  el.querySelector('#shareBtn').addEventListener('click', () => {
    const fullText = shareText + '\n' + GAME_URL;
    if (navigator.share) {
      navigator.share({ text: fullText }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        const btn = el.querySelector('#shareBtn');
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Share'; }, 2000);
      });
    }
  });

  el.querySelector('#resetBtn').addEventListener('click', doReset);
}
