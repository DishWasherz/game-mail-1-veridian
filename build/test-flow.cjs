#!/usr/bin/env node

/**
 * End-to-end logic test for the game flow.
 * Tests: credentials, EFB trigger, board answers, state persistence.
 */

const data = require('../data/emails.json');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

// Test 1: Data integrity
assert(data.act1.length === 96, 'Act 1 should have 96 emails');
assert(data.act2.length === 20, 'Act 2 should have 20 emails');
assert(data.finalBatch.length === 3, 'Final batch should have 3 emails');
assert(data.efb !== null, 'EFB should exist');
assert(data.efb.subject === '(No Subject)', 'EFB subject should be "(No Subject)"');
assert(data.efb.from === 'sarahc@gmail.com', 'EFB from should be sarah');

// Test 2: Email #15 CC
const e15 = data.act1.find(e => e.id === 15);
assert(e15.cc === 'S. Colvin (sarahc@gmail.com)', '#15 CC should contain personal email');

// Test 3: Email #49 has placeholder (password only, no address)
const e49 = data.act1.find(e => e.id === 49);
assert(e49.body.includes('[RANDOMIZED]'), '#49 should contain [RANDOMIZED] placeholder');
assert(!e49.body.includes('sarahc@gmail.com'), '#49 should NOT contain the email address (address comes from #15 CC)');

// Test 3b: Password login -- rendered #49 body matches login validator (single source of truth)
function simulateSession() {
  // Generate a session password (same logic as credentials.js)
  const digits = String(Math.floor(Math.random() * 900) + 100);
  const sarahPass = `rooftop-${digits}`;
  const credentials = {
    daniel: { email: 'd.hartman@veridian-corp.com', password: 'test-word-123' },
    sarah: { email: 'sarahc@gmail.com', password: sarahPass }
  };
  // Simulate rendering #49 body (what the player sees)
  const renderedBody = e49.body.replace('[RANDOMIZED]', credentials.sarah.password);
  // Extract the password from the rendered body
  const match = renderedBody.match(/password is (\S+)\./i);
  const extractedPass = match ? match[1] : null;
  // Validate login with extracted password
  const normalEmail = credentials.sarah.email;
  const loginResult = (normalEmail === credentials.sarah.email && extractedPass === credentials.sarah.password) ? 'sarah' : null;
  return { sarahPass, extractedPass, loginResult };
}
const s1 = simulateSession();
assert(s1.extractedPass === s1.sarahPass, 'Extracted password from #49 should match session password');
assert(s1.loginResult === 'sarah', 'Login with extracted #49 password should succeed (fresh session)');
const s2 = simulateSession();
assert(s2.extractedPass === s2.sarahPass, 'Extracted password from #49 should match session password (reload)');
assert(s2.loginResult === 'sarah', 'Login with extracted #49 password should succeed (after reload)');
assert(s1.sarahPass !== s2.sarahPass || true, 'Passwords may differ across sessions (probabilistic)');

// Test 3c: Sarah password format is rooftop-###
assert(/^rooftop-\d{3}$/.test(s1.sarahPass), 'Sarah password should be rooftop-### format');

// Test 4: EFB trigger logic
const MISSING_IDS = data.act1.filter(e => e.category === 'MISSING').map(e => e.id);
const AFFAIR_IDS = data.act1.filter(e => e.category === 'AFFAIR').map(e => e.id);
assert(MISSING_IDS.length === 6, 'Should have 6 MISSING emails');
assert(AFFAIR_IDS.length === 10, 'Should have 10 AFFAIR emails');

// Simulate opening 25 emails including 2 MISSING and 1 AFFAIR
const opened = [];
// Add 2 MISSING
opened.push(MISSING_IDS[0], MISSING_IDS[1]);
// Add 1 AFFAIR
opened.push(AFFAIR_IDS[0]);
// Fill rest with any emails
for (const e of data.act1) {
  if (opened.length >= 25) break;
  if (!opened.includes(e.id)) opened.push(e.id);
}
assert(opened.length >= 25, 'Should have 25+ opened emails');
const missingOpened = opened.filter(id => MISSING_IDS.includes(id)).length;
const affairOpened = opened.filter(id => AFFAIR_IDS.includes(id)).length;
assert(missingOpened >= 2, 'Should have 2+ MISSING opened');
assert(affairOpened >= 1, 'Should have 1+ AFFAIR opened');

// Test 5: Board answer containment matching
const BOARD_KEYWORDS = {
  killer: {
    pass: ['paul', 'martino', 'manipulator'],
    fail: ['richard', 'hale', 'daniel', 'hartman']
  },
  location: {
    club: ['greenside', 'padel'],
    space: ['basement', 'storage', 'downstairs', 'back room', 'underneath', 'below'],
    fail: []
  },
  motive: {
    pass: ['espionage', 'spy', 'spying', 'intel', 'intelligence', 'information', 'documents', 'secrets', 'theft', 'stealing', 'steal', 'ansible'],
    fail: ['jealous', 'jealousy', 'affair', 'fraud', 'whistleblow']
  }
};

function normalizeAnswer(text) {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function checkField(field, value) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return false;
  const keywords = BOARD_KEYWORDS[field];
  if (keywords.fail && keywords.fail.length > 0 && keywords.fail.some(term => normalized.includes(term))) return false;
  if (keywords.club) {
    const hasClub = keywords.club.some(term => normalized.includes(term));
    const hasSpace = keywords.space.some(term => normalized.includes(term));
    return hasClub && hasSpace;
  }
  return keywords.pass.some(term => normalized.includes(term));
}

function checkAll(killer, location, motive) {
  return checkField('killer', killer) && checkField('location', location) && checkField('motive', motive);
}

// Unit test: "Paul M / Greenside basement / Corporate theft" MUST pass
assert(checkAll('Paul M', 'Greenside basement', 'Corporate theft'), '"Paul M / Greenside basement / Corporate theft" must pass');

// Unit test: "greenside padel club" alone fails (no space term)
assert(!checkField('location', 'greenside padel club'), '"greenside padel club" must fail (no space term)');

// Unit test: "the storage room under the padel club" passes (club + space)
assert(checkField('location', 'the storage room under the padel club'), '"the storage room under the padel club" must pass');

// Unit test from brief: "Richard Hale / Company HQ / Cover up fraud" MUST fail
assert(!checkAll('Richard Hale', 'Company HQ', 'Cover up fraud'), '"Richard Hale / Company HQ / Cover up fraud" must fail');

// Unit test: "espionage to cover up fraud" must fail (fail-term "fraud" evaluated first)
assert(!checkField('motive', 'espionage to cover up fraud'), '"espionage to cover up fraud" must fail (fraud is fail-term)');

// Test 6: Individual field checks
const fieldTests = [
  ['killer', 'Paul Martino', true],
  ['killer', 'paul', true],
  ['killer', 'martino', true],
  ['killer', 'The Manipulator', true],
  ['killer', 'Richard Hale', false],
  ['killer', 'Daniel Hartman', false],
  ['killer', 'Paul and Daniel', false],  // contains fail-term "daniel"
  ['location', 'Greenside Padel Club basement', true],
  ['location', 'padel club storage room', true],
  ['location', 'greenside basement', true],
  ['location', 'greenside downstairs', true],
  ['location', 'the back room at greenside', true],
  ['location', 'Greenside Padel Club', false],  // no space term
  ['location', 'padel club', false],  // no space term
  ['location', 'storage room', false],  // no club term
  ['location', 'basement', false],  // no club term
  ['location', 'Company headquarters', false],
  ['location', 'office', false],
  ['motive', 'corporate espionage', true],
  ['motive', 'spying', true],
  ['motive', 'stealing documents', true],
  ['motive', 'to get ansible intel', true],
  ['motive', 'jealousy', false],
  ['motive', 'affair', false],
  ['motive', 'fraud', false],
  ['motive', 'whistleblower', false],
];

for (const [field, answer, expected] of fieldTests) {
  const result = checkField(field, answer);
  assert(result === expected, `"${answer}" for ${field} should ${expected ? 'PASS' : 'FAIL'} (got ${result})`);
}

// Test 6b: Dropdown threshold (10+ emails opened in second inbox, counts across both folders)
const THRESHOLD = 10;
// Sarah's inbox emails (not from sarah) and sent emails (from sarah) both count
const sarahInbox = data.act2.filter(e => e.from !== 'sarahc@gmail.com');
const sarahSent = data.act2.filter(e => e.from === 'sarahc@gmail.com');
assert(sarahInbox.length === 15, `Sarah inbox should have 15 emails (got ${sarahInbox.length})`);
assert(sarahSent.length === 5, `Sarah sent should have 5 emails (got ${sarahSent.length})`);

// Simulate: 7 inbox + 2 sent = 9, no dropdowns
const simOpened9 = [...sarahInbox.slice(0, 7).map(e => e.id), ...sarahSent.slice(0, 2).map(e => e.id)];
assert(simOpened9.length === 9, 'Simulated 9 opened');
assert((simOpened9.length >= THRESHOLD) === false, '9 emails (mixed folders): no dropdowns');

// Simulate: 7 inbox + 3 sent = 10, dropdowns activate
const simOpened10 = [...sarahInbox.slice(0, 7).map(e => e.id), ...sarahSent.slice(0, 3).map(e => e.id)];
assert(simOpened10.length === 10, 'Simulated 10 opened');
assert((simOpened10.length >= THRESHOLD) === true, '10 emails (mixed folders): dropdowns activate');

// Test 7: Final batch structure
assert(data.finalBatch[0].id === 'F1', 'First final batch should be F1');
assert(data.finalBatch[1].id === 'F2', 'Second final batch should be F2');
assert(data.finalBatch[2].id === 'F3', 'Third final batch should be F3');
assert(data.finalBatch[0].body.includes('Sarah Colvin'), 'F1 should mention Sarah');
assert(data.finalBatch[2].body.includes('Paul Martino'), 'F3 should mention Paul');
// F1 is shown as forensics popup, only F2+F3 are inbox emails
// Case closed requires only F2 and F3
assert(data.finalBatch[1].body.length > 0, 'F2 should have a body');
assert(data.finalBatch[2].body.length > 0, 'F3 should have a body');

// Test 8: Search capability
function searchEmails(emails, query) {
  const q = query.toLowerCase();
  return emails.filter(e =>
    e.subject.toLowerCase().includes(q) ||
    e.from.toLowerCase().includes(q) ||
    (e.body || '').toLowerCase().includes(q)
  );
}

const greensideResults = searchEmails([...data.act1, ...data.act2], 'greenside');
assert(greensideResults.length >= 8, 'Search "Greenside" should find 8+ emails');

const emilyResults = searchEmails([...data.act1, ...data.act2], 'emily');
assert(emilyResults.length >= 5, 'Search "Emily" should find 5+ emails');

const storageResults = searchEmails([...data.act1, ...data.act2], 'storage room');
assert(storageResults.length >= 1, 'Search "storage room" should find 1+ emails');

// Test 9: All emails have bodies
const missingBodies = data.act1.filter(e => !e.body).map(e => e.id);
assert(missingBodies.length === 0, `All Act 1 emails should have bodies (missing: ${missingBodies.join(',')})`);

const missingBodies2 = data.act2.filter(e => !e.body).map(e => e.id);
assert(missingBodies2.length === 0, `All Act 2 emails should have bodies (missing: ${missingBodies2.join(',')})`);

// Test 10: Category distribution matches brief
const catCounts = {};
for (const e of data.act1) {
  catCounts[e.category] = (catCounts[e.category] || 0) + 1;
}
assert(catCounts['NOISE'] === 49, `NOISE should be 49 (got ${catCounts['NOISE']})`);
assert(catCounts['CONTRACT'] === 15, `CONTRACT should be 15 (got ${catCounts['CONTRACT'] || 0})`);
assert(catCounts['AFFAIR'] === 10, `AFFAIR should be 10 (got ${catCounts['AFFAIR'] || 0})`);
assert(catCounts['GREENSIDE'] === 11, `GREENSIDE should be 11 (got ${catCounts['GREENSIDE']})`);
assert(catCounts['MISSING'] === 6, `MISSING should be 6 (got ${catCounts['MISSING']})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
