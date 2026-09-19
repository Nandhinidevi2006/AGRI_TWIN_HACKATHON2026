// audit_strings.js
// Scans React component files for hard‑coded English string literals that are not wrapped by the translation helper.
// Usage: node audit_strings.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const componentDir = path.join(__dirname, 'src', 'components');
const pattern = '**/*.jsx';

function isTranslatable(line) {
  // ignore lines that already use translation function t or getStrings
  return !(line.includes('getStrings') || line.includes('t('));
}

function extractLiterals(line) {
  const regex = /"([^"\\]*?)"/g; // double‑quoted literals
  const matches = [];
  let m;
  while ((m = regex.exec(line)) !== null) {
    const lit = m[1].trim();
    if (lit) matches.push(lit);
  }
  return matches;
}

let findings = [];

glob(path.join(componentDir, pattern), (err, files) => {
  if (err) {
    console.error('Glob error', err);
    process.exit(1);
  }
  files.forEach(file => {
    const rel = path.relative(componentDir, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (!isTranslatable(line)) return;
      const literals = extractLiterals(line);
      literals.forEach(lit => {
        // heuristic: English if contains letters/spaces and more than one word
        if (/^[A-Za-z0-9 ,.!?\-]+$/.test(lit) && lit.split(' ').length > 1) {
          findings.push({ file: rel, line: idx + 1, text: lit });
        }
      });
    });
  });

  if (findings.length === 0) {
    console.log('✅ No hard‑coded English literals found.');
  } else {
    console.log('🔎 Potential hard‑coded literals:');
    findings.forEach(f => {
      console.log(`${f.file}:${f.line} -> "${f.text}"`);
    });
  }
});
