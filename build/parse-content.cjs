#!/usr/bin/env node

/**
 * Parses design/email-bodies.md + design/case-01-email-metadata.md
 * into game/data/emails.json
 *
 * Run: node game/build/parse-content.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BODIES_PATH = path.join(ROOT, 'design', 'email-bodies.md');
const META_PATH = path.join(ROOT, 'design', 'case-01-email-metadata.md');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'emails.json');

function parseMetadata(content) {
  const act1 = [];
  const act2 = [];
  const finalBatch = [];
  let efb = null;

  // Parse Act 1 table
  const act1Match = content.match(/## Timeline:[^\n]+\n\s*\|[^\n]+\n\s*\|[-|\s]+\n([\s\S]*?)(?=\n---|\n## Email From Beyond)/);
  if (act1Match) {
    const rows = act1Match[1].trim().split('\n').filter(r => r.startsWith('|'));
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length < 9) continue;
      const [id, date, from, to, cc, subject, thread, category, purpose] = cells;
      const numId = parseInt(id);
      if (isNaN(numId)) continue;
      act1.push({
        id: numId,
        date,
        from,
        to: to || 'Daniel Hartman',
        cc: cc === '—' || cc === '--' ? null : cc,
        subject,
        thread: thread === '—' || thread === '--' ? null : thread,
        category
      });
    }
  }

  // Parse EFB
  const efbMatch = content.match(/## Email From Beyond[\s\S]*?\|[^\n]+\n\s*\|[-|\s]+\n\s*\|([^\n]+)\|/);
  if (efbMatch) {
    efb = {
      id: 'efb',
      date: null,
      from: 'sarahc@gmail.com',
      to: 'Daniel Hartman',
      cc: null,
      subject: '(No Subject)',
      thread: null,
      category: 'PLOT'
    };
  }

  // Parse Act 2 table
  const act2Match = content.match(/## Account: sarahc@gmail\.com[\s\S]*?\|[^\n]+\n\s*\|[-|\s]+\n([\s\S]*?)(?=\n---|\n## Final Batch)/);
  if (act2Match) {
    const rows = act2Match[1].trim().split('\n').filter(r => r.startsWith('|'));
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length < 9) continue;
      const [id, date, from, to, cc, subject, thread, category, purpose] = cells;
      const numId = parseInt(id);
      if (isNaN(numId)) continue;
      act2.push({
        id: numId,
        date,
        from,
        to: to || 'sarahc.private@gmail.com',
        cc: cc === '—' || cc === '--' ? null : cc,
        subject,
        thread: thread === '—' || thread === '--' ? null : thread,
        category
      });
    }
  }

  // Parse Final Batch table
  const fbMatch = content.match(/## Final Batch[\s\S]*?\|[^\n]+\n\s*\|[-|\s]+\n([\s\S]*?)(?=\n---)/);
  if (fbMatch) {
    const rows = fbMatch[1].trim().split('\n').filter(r => r.startsWith('|'));
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length < 6) continue;
      const [id, from, to, subject, category, purpose] = cells;
      if (!id.startsWith('F')) continue;
      finalBatch.push({
        id,
        date: null,
        from,
        to: to || 'Daniel Hartman',
        cc: null,
        subject,
        thread: null,
        category
      });
    }
  }

  return { act1, act2, efb, finalBatch };
}

function parseBodies(content) {
  const bodies = { act1: {}, act2: {}, efb: null, finalBatch: {} };

  // Split into major sections
  const act1Section = content.match(/# Act 1 -- Suspect's Inbox \(Daniel Hartman\)\s*\n---\s*\n([\s\S]*?)(?=# Act 2 -- Victim's Secret Inbox)/);
  const act2Section = content.match(/# Act 2 -- Victim's Secret Inbox \(Sarah Colvin\)\s*\n---\s*\n([\s\S]*?)(?=# EFB -- Email From Beyond)/);
  const efbSection = content.match(/# EFB -- Email From Beyond \(Dynamic\)\s*\n---\s*\n([\s\S]*?)(?=# Final Batch)/);
  const fbSection = content.match(/# Final Batch -- Unlocked when the investigation board turns green\s*\n[\s\S]*?---\s*\n([\s\S]*?)$/);

  function extractEmails(section) {
    const emails = {};
    if (!section) return emails;
    const text = section[1];

    // Match ## #N -- Subject or ## FN -- Subject
    const emailBlocks = text.split(/\n## /).map((b, i) => i === 0 ? b.replace(/^## /, '') : b);
    for (const block of emailBlocks) {
      if (!block.trim()) continue;
      const idMatch = block.match(/^#?(\d+|F\d+|EFB)\s+--\s+/);
      if (!idMatch) continue;

      const id = idMatch[1];
      // Find the body: everything after the last metadata line (Date:) and the blank line
      const lines = block.split('\n');
      let bodyStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('**Date:**')) {
          bodyStart = i + 1;
          break;
        }
      }
      if (bodyStart === -1) continue;

      // Skip leading empty lines
      while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;

      // Collect body until --- or end
      const bodyLines = [];
      for (let i = bodyStart; i < lines.length; i++) {
        if (lines[i].trim() === '---') break;
        bodyLines.push(lines[i]);
      }

      // Trim trailing empty lines
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

      emails[id] = bodyLines.join('\n');
    }
    return emails;
  }

  bodies.act1 = extractEmails(act1Section);
  bodies.act2 = extractEmails(act2Section);
  bodies.finalBatch = extractEmails(fbSection);

  // EFB body
  if (efbSection) {
    const efbEmails = extractEmails(efbSection);
    bodies.efb = efbEmails['EFB'] || null;
  }

  return bodies;
}

// Run
const metaContent = fs.readFileSync(META_PATH, 'utf-8');
const bodiesContent = fs.readFileSync(BODIES_PATH, 'utf-8');

const metadata = parseMetadata(metaContent);
const bodies = parseBodies(bodiesContent);

// Merge bodies into metadata
for (const email of metadata.act1) {
  email.body = bodies.act1[String(email.id)] || '';
}
for (const email of metadata.act2) {
  email.body = bodies.act2[String(email.id)] || '';
}
if (metadata.efb) {
  metadata.efb.body = bodies.efb || '';
}
for (const email of metadata.finalBatch) {
  email.body = bodies.finalBatch[email.id] || '';
}

// Verify counts
console.log(`Act 1: ${metadata.act1.length} emails`);
console.log(`Act 2: ${metadata.act2.length} emails (expected 20)`);
console.log(`Final Batch: ${metadata.finalBatch.length} emails (expected 3)`);
console.log(`EFB: ${metadata.efb ? 'present' : 'missing'}`);

// Check for missing bodies
const missingAct1 = metadata.act1.filter(e => !e.body).map(e => e.id);
const missingAct2 = metadata.act2.filter(e => !e.body).map(e => e.id);
if (missingAct1.length) console.warn(`Missing Act 1 bodies: ${missingAct1.join(', ')}`);
if (missingAct2.length) console.warn(`Missing Act 2 bodies: ${missingAct2.join(', ')}`);

// Output
const output = {
  act1: metadata.act1,
  act2: metadata.act2,
  efb: metadata.efb,
  finalBatch: metadata.finalBatch
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`\nWritten to ${OUTPUT_PATH}`);
