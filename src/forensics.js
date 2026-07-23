import { navigate, getCredentials } from './app.js';

export function renderForensics(container) {
  const credentials = getCredentials();
  const el = document.createElement('div');
  el.className = 'forensics-overlay';
  el.innerHTML = `
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
        <p>When you think you have the full picture, put it on the investigation board: the who, the where, the why. The DA won't move on half a theory, so make sure it holds together before you submit. Everything you need is in his mailbox. No fieldwork, just read carefully.</p>
        <p>Good hunting ;)<br>M., Digital Forensics</p>
      </div>
      <button class="forensics-btn" id="forensicsClose">Go to the login screen</button>
    </div>
  `;

  container.appendChild(el);

  el.querySelector('#forensicsClose').addEventListener('click', () => {
    navigate('login');
  });
}
