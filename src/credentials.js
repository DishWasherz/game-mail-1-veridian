
function generateDanielPassword() {
  const digits = String(Math.floor(Math.random() * 900) + 100);
  return `sarah-${digits}`;
}

function generateSarahPassword() {
  const digits = String(Math.floor(Math.random() * 900) + 100);
  return `rooftop-${digits}`;
}

export function initCredentials() {
  let stored = localStorage.getItem('gm_credentials');
  if (stored) return JSON.parse(stored);

  const credentials = {
    daniel: {
      email: 'd.hartman@veridian-corp.com',
      password: generateDanielPassword()
    },
    sarah: {
      email: 'sarahc@gmail.com',
      password: generateSarahPassword()
    }
  };

  localStorage.setItem('gm_credentials', JSON.stringify(credentials));
  return credentials;
}

export function validateLogin(email, password, credentials) {
  const normalEmail = email.trim().toLowerCase();
  const normalPass = password.trim();

  if (normalEmail === credentials.daniel.email && normalPass === credentials.daniel.password) {
    return 'daniel';
  }
  if (normalEmail === credentials.sarah.email && normalPass === credentials.sarah.password) {
    return 'sarah';
  }
  return null;
}
