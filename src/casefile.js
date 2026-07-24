import { navigate, getState, getEmailData, doReset } from './app.js';
import { TALLY_PLAYTEST_URL, TALLY_CASE02_URL, GAME_URL } from './config.js';

function formatDuration(ms) {
  if (!ms) return 'under 1m';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (totalSecs < 60) return 'under 1m';
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
          <div class="casefile-debrief">
            <h3 class="casefile-debrief-title">Addendum: for the record</h3>
            <p class="casefile-debrief-intro">You solved the case. Did you actually spot everything?</p>
            <div class="casefile-debrief-rows">
              <details class="casefile-debrief-row">
                <summary>Five days apart</summary>
                <p>Paul used Emily to recruit Sarah. In "FW: Emily's new thing" (Daniel's inbox), Emily's forwarded note telling Sarah "you should come play sometime" is dated Feb 20. Paul's invitation to Sarah's personal address ("You should join us", in her inbox) followed on Feb 25. Emily opened the door for him, and nothing suggests she ever knew that was her role.</p>
              </details>
              <details class="casefile-debrief-row">
                <summary>The same favor, twice</summary>
                <p>In "Small favor" (Sarah's inbox, Apr 9), Paul asks Sarah to bring the quarterly client report to a Saturday session, supposedly for research. In "Greenside admin - quarterly report update" (Daniel's inbox, Jul 6), he asks Daniel for the quarterly report "when you come Saturday", supposedly for club statistics. He reused the method on Daniel because it had already worked on Sarah.</p>
              </details>
              <details class="casefile-debrief-row">
                <summary>Last Saturday</summary>
                <p>In "Saw Sarah at Greenside last Saturday" (Daniel's inbox, Jul 9), Paul mentions running into Sarah at the club, as if by chance. That Saturday, Jul 4, was the meeting he had ordered in "Saturday meeting - storage room" (Sarah's inbox): the club basement, 2 PM, come alone. And he sent that cheerful anecdote to Daniel on Jul 9, the same day Sarah was taken. He was making small talk with her lover hours before abducting her.</p>
              </details>
              <details class="casefile-debrief-row">
                <summary>When exactly did Sarah disappear?</summary>
                <p>In "Sarah Colvin - no building access logged since July 9" (Daniel's inbox), Karen gives the exact time of Sarah's last badge scan: 8:47 AM on Thursday Jul 9. Sarah's last email, "I'm scared", went out later that same day. Put together, they answer the question: Thursday evening, after she wrote that she was scared.</p>
              </details>
              <details class="casefile-debrief-row">
                <summary>Two passwords</summary>
                <p>Daniel's password, on the forensics note, is "sarah" followed by digits. Sarah's password, shared in "if you need to reach me after hours", starts with "rooftop". Her very first email to Daniel ("Thursday?") suggests "that place on 4th street, the one with the rooftop".</p>
              </details>
              <details class="casefile-debrief-row">
                <summary>His name</summary>
                <p>Rearrange the letters of PAUL MARTINO and you get MANIPULATOR.</p>
              </details>
            </div>
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
