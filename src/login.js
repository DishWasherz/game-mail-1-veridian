import { handleLogin, navigate, doReset, getCredentials } from './app.js';

export function renderLogin(container) {
  const credentials = getCredentials();
  const el = document.createElement('div');
  el.className = 'login-screen';
  el.innerHTML = `
    <div class="login-card">
      <div class="login-sticky-note">
        <div class="sticky-note-label">From forensics:</div>
        <div class="sticky-note-cred"><span class="sticky-note-key">Email:</span> ${credentials.daniel.email}</div>
        <div class="sticky-note-cred"><span class="sticky-note-key">Password:</span> ${credentials.daniel.password}</div>
      </div>
      <div class="login-brand">
        <div class="login-logo">V</div>
        <h1>Veridian Webmail</h1>
        <p class="login-tagline">Secure corporate communications</p>
      </div>
      <form class="login-form" id="loginForm" autocomplete="off" data-form-type="other">
        <div class="login-field">
          <label for="detective-id">Email</label>
          <input type="text" id="detective-id" name="detective-id" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="name@domain.com" required>
        </div>
        <div class="login-field">
          <label for="access-code">Password</label>
          <input type="text" id="access-code" name="access-code" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" placeholder="Password" required>
        </div>
        <div class="login-error" id="loginError"></div>
        <button type="submit" class="login-btn">Sign In</button>
      </form>
      <div class="login-footer">
        <button class="link-btn" id="showForensicsBtn">Case file</button>
        <button class="link-btn" id="resetBtn">Reset investigation</button>
      </div>
    </div>
  `;

  container.appendChild(el);

  const form = el.querySelector('#loginForm');
  const errorEl = el.querySelector('#loginError');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = el.querySelector('#detective-id').value;
    const password = el.querySelector('#access-code').value;

    const success = handleLogin(email, password);
    if (!success) {
      errorEl.textContent = 'Incorrect email or password.';
      errorEl.style.display = 'block';
    }
  });

  el.querySelector('#showForensicsBtn').addEventListener('click', () => {
    navigate('forensics');
  });

  el.querySelector('#resetBtn').addEventListener('click', doReset);
}
