import posthog from 'posthog-js';
import { POSTHOG_KEY, POSTHOG_HOST, SESSION_REPLAY_ENABLED } from './config.js';

const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let initialized = false;

export function initAnalytics() {
  if (isLocalhost) return;
  if (!POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: !SESSION_REPLAY_ENABLED
  });

  initialized = true;
}

export function trackEvent(name, props = {}) {
  if (!initialized) return;
  posthog.capture(name, props);
}
