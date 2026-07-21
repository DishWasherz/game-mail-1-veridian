// All tunable game constants in one place

export const GAME_TODAY = 'Mon Jul 20';

export const EFB_THRESHOLDS = {
  totalEmailsOpened: 25,
  missingCategoryOpened: 2,
  affairCategoryOpened: 1
};

export const BOARD_DROPDOWN_THRESHOLD = 10; // emails opened in second inbox

export const BOARD_COOLDOWN_MS = 60000; // 60 seconds between submissions

export const BOARD_OPTIONS = {
  killer: [
    'Daniel Hartman',
    'Richard Hale',
    'Paul Martino',
    'Greg Nolan',
    'Emily Tan'
  ],
  location: [
    'Veridian headquarters',
    "Daniel Hartman's residence",
    "Paul Martino's residence",
    'Greenside Padel Club',
    "Emily Tan's apartment",
    'Ansible Group offices'
  ],
  motive: [
    'Cover up corporate fraud',
    'Romantic jealousy',
    'Corporate espionage',
    'Silencing a whistleblower',
    'Blackmail gone wrong'
  ]
};

// Board answer keyword lists (containment matching, fail-terms first)
export const BOARD_KEYWORDS = {
  killer: {
    pass: ['paul', 'martino', 'manipulator'],
    fail: ['richard', 'hale', 'daniel', 'hartman']
  },
  location: {
    pass: ['greenside', 'padel', 'club basement', 'storage room'],
    fail: []
  },
  motive: {
    pass: ['espionage', 'spy', 'spying', 'intel', 'intelligence', 'information', 'documents', 'secrets', 'theft', 'stealing', 'steal', 'ansible'],
    fail: ['jealous', 'jealousy', 'affair', 'fraud', 'whistleblow']
  }
};

// Categories that count toward EFB triggers
export const MISSING_CATEGORIES = ['MISSING'];
export const AFFAIR_CATEGORIES = ['AFFAIR'];

export const POSTHOG_KEY = __POSTHOG_KEY__;
export const POSTHOG_HOST = __POSTHOG_HOST__;
export const SESSION_REPLAY_ENABLED = __SESSION_REPLAY__;

export const TALLY_PLAYTEST_URL = 'https://tally.so/r/5BgGoQ';
export const TALLY_CASE02_URL = 'https://tally.so/r/9qgE0E';
export const GAME_URL = 'https://game-mail-1-veridian.up.railway.app';

