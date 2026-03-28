import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const root = process.cwd();
const textPath = process.argv[2] || path.join(root, 'scripts', 'data', 'signs-arm.txt');
const dbPath = process.argv[3] || path.join(root, 'public', 'assets', 'databases', 'data.db');
const distDbPath = path.join(root, 'dist', 'assets', 'databases', 'data.db');
const languageId = '102';

function normalizeSpace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCode(value) {
  const match = normalizeSpace(value).match(/^(\d+\.\d+(?:\.\d+)?)/u);
  return match ? match[1] : null;
}

function stripCodePrefix(value, code = null) {
  const input = normalizeSpace(value);
  if (!input) {
    return '';
  }

  const signCode = normalizeSpace(code) || extractCode(input);
  if (!signCode) {
    return input;
  }

  return normalizeSpace(
    input.replace(
      new RegExp(`^${escapeRegex(signCode)}(?:\\.)?\\s*[\\-–—.:;,)]*\\s*`, 'u'),
      '',
    ),
  );
}

function extractQuotedName(value) {
  const match = String(value ?? '').match(/«\s*([^»]+?)\s*»/u);
  return match ? `«${normalizeSpace(match[1])}»` : null;
}

function normalizeName(value) {
  const text = normalizeSpace(value);
  if (!text) {
    return '';
  }

  const quoted = extractQuotedName(text);
  if (quoted) {
    return quoted;
  }

  return normalizeSpace(text.replace(/[.:;,]+$/u, ''));
}

function createEntry(code) {
  return {
    code,
    name: null,
    parts: [],
    seen: new Set(),
  };
}

function appendPart(entry, rawText) {
  const text = normalizeSpace(rawText);
  if (!text || entry.seen.has(text)) {
    return;
  }

  entry.parts.push(text);
  entry.seen.add(text);
}

function addLineToEntry(map, code, rawLine) {
  const entry = map.get(code) ?? createEntry(code);
  map.set(code, entry);

  const line = stripCodePrefix(rawLine, code);
  if (!line) {
    return;
  }

  const quotedName = extractQuotedName(line);
  if (quotedName && !entry.name) {
    entry.name = quotedName;
  }

  const normalizedName = normalizeSpace((entry.name ?? '').replace(/^[«"]|[»"]$/g, ''));
  const normalizedLine = normalizeSpace(line.replace(/^[«"]|[»"]$/g, '').replace(/[.:;,]+$/g, ''));

  if (normalizedName && normalizedLine === normalizedName) {
    return;
  }

  appendPart(entry, line);
}

function parseSignsText(raw) {
  const map = new Map();
  let currentCode = null;

  const lines = String(raw ?? '').replace(/\r/g, '').split('\n');

  for (const rawLine of lines) {
    const line = normalizeSpace(rawLine);
    if (!line) {
      continue;
    }

    const codeMatch = line.match(/^(\d+\.\d+(?:\.\d+)?)(?:\.)?\s*(.*)$/u);
    if (codeMatch) {
      currentCode = codeMatch[1];
      addLineToEntry(map, currentCode, line);
      continue;
    }

    if (!currentCode) {
      continue;
    }

    addLineToEntry(map, currentCode, line);
  }

  return map;
}

function finalizeDescription(entry) {
  return cleanDescription(entry.parts.join(' '), entry.code, entry.name ?? '');
}

function cleanDescription(rawDescription, code, name) {
  let description = normalizeSpace(rawDescription);
  if (!description) {
    return '';
  }

  description = stripCodePrefix(description, code);

  const normalizedName = normalizeSpace(
    String(name ?? '')
      .replace(/^[«"]|[»"]$/g, '')
      .replace(/[.:;,]+$/g, ''),
  );

  const removePrefix = (prefix) => {
    if (!prefix) {
      return;
    }
    description = normalizeSpace(
      description.replace(
        new RegExp(`^${escapeRegex(prefix)}\\s*[.:;,\\-–—]?\\s*`, 'u'),
        '',
      ),
    );
  };

  removePrefix(normalizeName(name));
  removePrefix(normalizedName);

  while (normalizedName) {
    const next = normalizeSpace(
      description.replace(
        new RegExp(
          `^[«"]?\\s*${escapeRegex(normalizedName)}\\s*[»"]?\\s*[.:;,\\-–—]?\\s*`,
          'u',
        ),
        '',
      ),
    );

    if (next === description) {
      break;
    }
    description = next;
  }

  description = normalizeSpace(description);
  if (!description) {
    return '';
  }

  const normalizedDescription = normalizeSpace(
    description.replace(/^[«"]|[»"]$/g, '').replace(/[.:;,]+$/g, ''),
  );
  if (normalizedName && normalizedDescription === normalizedName) {
    return '';
  }

  return description;
}

function resolveNameForRow(rawTitle, rawDescription, code, parsed) {
  const parsedName = normalizeName(parsed?.name ?? '');
  if (parsedName) {
    return parsedName;
  }

  const fromTitle = normalizeName(stripCodePrefix(rawTitle, code));
  if (fromTitle) {
    return fromTitle;
  }

  const fromDescription = normalizeName(extractQuotedName(rawDescription));
  if (fromDescription) {
    return fromDescription;
  }

  return normalizeName(rawTitle);
}

async function run() {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite DB not found: ${dbPath}`);
  }

  let textEntries = new Map();
  if (fs.existsSync(textPath)) {
    const textContent = fs.readFileSync(textPath, 'utf8');
    textEntries = parseSignsText(textContent);
    console.log(`[ok] parsed text entries: ${textEntries.size}`);
  } else {
    console.log(`[skip] text file not found: ${textPath}`);
  }

  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  const tableInfo = db.exec('PRAGMA table_info(road_sign_translations)');
  const columns = new Set((tableInfo[0]?.values ?? []).map((row) => String(row[1] ?? '').toLowerCase()));
  const hasCodeColumn = columns.has('code');
  if (!hasCodeColumn) {
    db.run('ALTER TABLE road_sign_translations ADD COLUMN code TEXT');
  }

  const result = db.exec(
    `
    SELECT id, road_sign_id, language_id, code, title, description
    FROM road_sign_translations
    ORDER BY CAST(road_sign_id AS INTEGER), CAST(language_id AS INTEGER)
    `,
  );
  const rows = result[0]?.values ?? [];

  const updateAllStmt = db.prepare(
    `
    UPDATE road_sign_translations
    SET code = ?, title = ?, description = ?
    WHERE CAST(id AS TEXT) = ?
    `,
  );

  const updateCodeStmt = db.prepare(
    `
    UPDATE road_sign_translations
    SET code = ?
    WHERE CAST(id AS TEXT) = ?
    `,
  );

  const codeBySignId = new Map();
  for (const [, roadSignId, , currentCode, currentTitle] of rows) {
    const code = normalizeSpace(currentCode) || extractCode(currentTitle);
    if (code && !codeBySignId.has(String(roadSignId))) {
      codeBySignId.set(String(roadSignId), code);
    }
  }

  let changedTextRows = 0;
  let changedCodeRows = 0;

  for (const [id, roadSignId, langId, currentCode, currentTitle, currentDescription] of rows) {
    const existingCode = normalizeSpace(currentCode);
    const existingTitle = String(currentTitle ?? '');
    const existingDescription = String(currentDescription ?? '');
    const inferredCode = existingCode || extractCode(existingTitle) || codeBySignId.get(String(roadSignId)) || '';

    const lang = String(langId ?? '');
    if (lang !== languageId) {
      if (!inferredCode) {
        continue;
      }
      if (existingCode === inferredCode) {
        continue;
      }
      updateCodeStmt.run([inferredCode, String(id)]);
      changedCodeRows += 1;
      continue;
    }

    const parsed = inferredCode ? textEntries.get(inferredCode) : null;
    const nextTitle = resolveNameForRow(existingTitle, existingDescription, inferredCode, parsed)
      || normalizeSpace(stripCodePrefix(existingTitle, inferredCode))
      || normalizeSpace(existingTitle);
    const rawNextDescription = parsed ? finalizeDescription(parsed) : existingDescription;
    const nextDescription = cleanDescription(rawNextDescription, inferredCode, nextTitle);

    if (
      existingCode === inferredCode
      && existingTitle === nextTitle
      && existingDescription === nextDescription
    ) {
      continue;
    }

    updateAllStmt.run([inferredCode, nextTitle, nextDescription, String(id)]);
    changedTextRows += 1;
  }

  updateAllStmt.free();
  updateCodeStmt.free();

  const output = Buffer.from(db.export());
  fs.writeFileSync(dbPath, output);
  if (fs.existsSync(distDbPath)) {
    fs.writeFileSync(distDbPath, output);
  }

  db.close();
  console.log(`[ok] updated text rows (lang ${languageId}): ${changedTextRows}`);
  console.log(`[ok] updated code rows (other langs): ${changedCodeRows}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
