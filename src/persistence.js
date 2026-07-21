const STORAGE_KEY = 'gm_state';

const DEFAULT_STATE = {
  openedEmails: { daniel: [], sarah: [] },
  starredEmails: { daniel: [], sarah: [] },
  currentInbox: null,
  currentFolder: 'inbox',
  efbDelivered: false,
  boardState: { killer: '', location: '', motive: '' },
  boardCorrect: false,
  boardSubmissions: 0,
  finalBatchDelivered: false,
  finalBatchRead: [],
  caseClosed: false,
  caseFileSeen: false,
  lastBoardSubmit: 0,
  startTime: null,
  endTime: null,
  bestTime: null
};

export function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('gm_credentials');
}
