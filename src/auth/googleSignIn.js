const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('google-script')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google-script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function googleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export async function renderGoogleButton(parent, { locale, onCredential }) {
  const clientId = googleClientId();
  if (!clientId || !parent) return false;
  await loadGoogleScript();
  parent.replaceChildren();
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) onCredential(response.credential);
    },
    cancel_on_tap_outside: true,
  });
  window.google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    width: Math.max(parent.clientWidth || 320, 280),
    locale: locale === 'ja' ? 'ja' : 'vi',
  });
  return true;
}
