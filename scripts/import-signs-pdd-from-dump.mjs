import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const root = process.cwd();
const dumpPath = process.argv[2] || "/Users/jora/Desktop/index_db.sql";
const dbPath = process.argv[3] || path.join(root, "public", "assets", "databases", "data.db");
const distDbPath = path.join(root, "dist", "assets", "databases", "data.db");

const TABLE_ORDER = [
  "road_sign_categories",
  "road_sign_category_translations",
  "road_signs",
  "road_sign_translations",
  "pdd_chapters",
  "pdd_chapter_translations",
  "pdd_rules",
  "pdd_rule_translations",
  "exploitation_chapters",
  "exploitation_chapter_translations",
  "exploitations",
  "exploitation_translations",
];

function decodeSqlString(value) {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\0/g, "\0");
}

function parseCell(raw) {
  const token = raw.trim();
  if (token === "NULL") {
    return null;
  }

  if (token.startsWith("'") && token.endsWith("'")) {
    return decodeSqlString(token.slice(1, -1));
  }

  if (/^-?\d+$/.test(token)) {
    return Number.parseInt(token, 10);
  }

  if (/^-?\d+\.\d+$/.test(token)) {
    return Number.parseFloat(token);
  }

  return token;
}

function parseRow(rowText) {
  const cells = [];
  let current = "";
  let inString = false;
  let quoteChar = "";

  for (let i = 0; i < rowText.length; i += 1) {
    const ch = rowText[i];
    const prev = i > 0 ? rowText[i - 1] : "";

    if (inString) {
      current += ch;
      if (ch === quoteChar && prev !== "\\") {
        inString = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      quoteChar = ch;
      current += ch;
      continue;
    }

    if (ch === ",") {
      cells.push(parseCell(current));
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    cells.push(parseCell(current));
  }

  return cells;
}

function parseValuesBlock(valuesText) {
  const rows = [];
  let i = 0;

  while (i < valuesText.length) {
    if (valuesText[i] !== "(") {
      i += 1;
      continue;
    }

    let depth = 1;
    let j = i + 1;
    let inString = false;
    let quoteChar = "";

    while (j < valuesText.length && depth > 0) {
      const ch = valuesText[j];
      const prev = valuesText[j - 1];

      if (inString) {
        if (ch === quoteChar && prev !== "\\") {
          inString = false;
        }
        j += 1;
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = true;
        quoteChar = ch;
        j += 1;
        continue;
      }

      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }

      j += 1;
    }

    const rowText = valuesText.slice(i + 1, j - 1);
    rows.push(parseRow(rowText));
    i = j;
  }

  return rows;
}

function extractInsertStatements(sqlContent, tableName) {
  const token = "INSERT INTO `" + tableName + "`";
  const statements = [];
  let from = 0;

  while (from < sqlContent.length) {
    const start = sqlContent.indexOf(token, from);
    if (start === -1) {
      break;
    }

    let i = start;
    let inString = false;
    let quoteChar = "";

    while (i < sqlContent.length) {
      const ch = sqlContent[i];
      const prev = i > 0 ? sqlContent[i - 1] : "";

      if (inString) {
        if (ch === quoteChar && prev !== "\\") {
          inString = false;
        }
        i += 1;
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = true;
        quoteChar = ch;
        i += 1;
        continue;
      }

      if (ch === ";") {
        statements.push(sqlContent.slice(start, i + 1));
        i += 1;
        break;
      }

      i += 1;
    }

    from = i;
  }

  return statements;
}

function extractInsertBatches(sqlContent, tableName) {
  const batches = [];
  const statements = extractInsertStatements(sqlContent, tableName);

  for (const statement of statements) {
    const valuesIndex = statement.indexOf("VALUES");
    if (valuesIndex === -1) {
      continue;
    }

    const columnsStart = statement.indexOf("(");
    const columnsEnd = statement.indexOf(")", columnsStart + 1);
    if (columnsStart === -1 || columnsEnd === -1 || columnsEnd > valuesIndex) {
      continue;
    }

    const columns = statement
      .slice(columnsStart + 1, columnsEnd)
      .split(",")
      .map((col) => col.replace(/`/g, "").trim())
      .filter(Boolean);

    const rows = parseValuesBlock(statement.slice(valuesIndex + "VALUES".length, statement.lastIndexOf(";")).trim());
    batches.push({ columns, rows });
  }

  return batches;
}

function tableExists(db, tableName) {
  const stmt = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1");
  stmt.bind([tableName]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function importTable(db, sqlContent, tableName) {
  const batches = extractInsertBatches(sqlContent, tableName);
  if (batches.length === 0) {
    console.log(`[skip] ${tableName}: no INSERTs found in dump`);
    return 0;
  }

  db.run(`DELETE FROM ${tableName}`);

  let inserted = 0;
  for (const batch of batches) {
    const placeholders = batch.columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${tableName} (${batch.columns.join(", ")}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);

    for (const row of batch.rows) {
      if (row.length !== batch.columns.length) {
        continue;
      }
      stmt.run(row);
      inserted += 1;
    }

    stmt.free();
  }

  console.log(`[ok] ${tableName}: inserted ${inserted} rows`);
  return inserted;
}

async function run() {
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`SQL dump not found: ${dumpPath}`);
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite DB not found: ${dbPath}`);
  }

  const sqlContent = fs.readFileSync(dumpPath, "utf8");
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  db.run("PRAGMA foreign_keys = OFF");
  db.run("BEGIN TRANSACTION");

  try {
    for (const tableName of TABLE_ORDER) {
      if (!tableExists(db, tableName)) {
        console.log(`[skip] ${tableName}: table does not exist in SQLite DB`);
        continue;
      }
      importTable(db, sqlContent, tableName);
    }

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  } finally {
    db.run("PRAGMA foreign_keys = ON");
  }

  const out = db.export();
  fs.writeFileSync(dbPath, Buffer.from(out));

  if (fs.existsSync(path.dirname(distDbPath))) {
    fs.copyFileSync(dbPath, distDbPath);
  }

  db.close();
  console.log(`Done. Updated DB: ${dbPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
