import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import roadSafetyLawAccordionRaw from '../assets/road-safety-law-accordion.html?raw';
import exploitationAccordionRaw from '../assets/exploitation-accordion.html?raw';
import roadMarkingsSeedRaw from '../assets/road-markings-seed.json';

type DbRow = Record<string, any>;

export interface AnswerOption {
  id: number;
  is_right: boolean;
  title: string;
}

export interface QuestionItem {
  id: number;
  image: string | null;
  group_id: number | null;
  title: string;
  answers: AnswerOption[];
}

export interface WrongQuestionItem extends QuestionItem {
  selected_answer_id: number | null;
}

export interface StatsSummary {
  answered: number;
  total: number;
  errors: number;
  readiness: number;
  ticketsDone: number;
  ticketsTotal: number;
}

export interface ExamTestItem {
  id: number;
  title: string;
  question_count: number;
  solved_count: number;
  duration: number;
  max_wrong_answers: number;
}

export interface TheoryTopicItem {
  description: string;
  id: number;
  title: string;
  question_count: number;
  solved_count: number;
}

export interface SmartTheoryTopicItem extends TheoryTopicItem {
  accuracy: number;
  answered_count: number;
  correct_count: number;
  recommendation_reason: 'weak' | 'incomplete';
  wrong_count: number;
}

export interface FavoriteQuestionItem {
  id: number;
  title: string;
  image: string | null;
}

export interface RuleChapterItem {
  id: number;
  title: string;
  items_count: number;
}

export interface RuleContentItem {
  id: number;
  number: string;
  content: string;
  image?: string | null;
}

export interface SignReferenceItem {
  id: number;
  code: string;
  title: string;
  description: string;
  image: string | null;
}

export interface RoadMarkingReferenceItem {
  id: number;
  code: string;
  content: string;
  image: string | null;
}

interface RoadSafetyLawSeedItem {
  title: string;
  items: string[];
}

interface ExploitationSeedItem {
  title: string;
  items: string[];
}

interface RoadMarkingSeedItem {
  code: string;
  contentHtml: string;
  imageName?: string;
}

interface RoadMarkingSeedChapter {
  title: string;
  items: RoadMarkingSeedItem[];
}

const ROAD_SAFETY_LAW_FALLBACK_SEED: RoadSafetyLawSeedItem[] = [
  {
    title: 'Օրենքում կիրառվող հասկացություններ',
    items: [`
      <h4>Հիմնական հասկացություններ</h4>
      <p>Այս բաժնում ներկայացվում են ճանապարհային երթևեկության անվտանգության ոլորտում կիրառվող հիմնական տերմինները և դրանց մեկնաբանությունները։</p>
      <ul>
        <li>Անբավարար տեսանելիություն</li>
        <li>Ավտոդրոմ, ավտոհրապարակ</li>
        <li>Ավտոմոբիլ, տրանսպորտային միջոց</li>
        <li>Երթևեկելի մաս, երթևեկության գոտի</li>
        <li>Խաչմերուկ, հետիոտնային անցում</li>
        <li>Կանգառ, կայանում, հարկադրված կանգառ</li>
        <li>Վարորդ, հետիոտն, ուղևոր</li>
        <li>Ճանապարհատրանսպորտային պատահար</li>
      </ul>
      <p>Սույն ենթաբաժնի ամբողջական տեքստը կարող է համալրվել/թարմացվել տվյալների նույն աղյուսակում՝ առանց էջի կառուցվածքը փոխելու։</p>
    `],
  },
  {
    title: 'Հոդված 13․ Տրանսպորտային միջոցների պետական գրանցումը, պետական հաշվառումը և սահմանափակումները',
    items: [`
      <h4>Հիմնական դրույթներ</h4>
      <p>Հոդվածը սահմանում է տրանսպորտային միջոցների սեփականության, գրավի և լիզինգի իրավունքների պետական գրանցման, հաշվառման և սահմանափակումների կիրառման կարգը։</p>
      <ul>
        <li>Գործարքներից բխող իրավունքների գրանցման ժամկետներ</li>
        <li>Պահանջվող փաստաթղթեր և գրանցման հիմքեր</li>
        <li>Գրանցման մերժման դեպքեր</li>
        <li>Արգելադրում և դրա գրանցում</li>
      </ul>
    `],
  },
  {
    title: 'Հոդված 14. Տրանսպորտային միջոցների շահագործման ընթացքում ճանապարհային երթևեկության անվտանգության ապահովման հիմնական պահանջները',
    items: [`
      <h4>Հիմնական պահանջներ</h4>
      <p>Տրանսպորտային միջոցների տեխնիկական վիճակը և շահագործման պայմանները պետք է համապատասխանեն անվտանգության և շրջակա միջավայրի պահպանության նորմերին։</p>
      <p>Տեխնիկապես սարքին վիճակի ապահովման համար պատասխանատվությունը կրում է սեփականատերը կամ օգտագործողը։</p>
    `],
  },
  {
    title: 'Հոդված 24. Տրանսպորտային միջոցների սեփականատերերի և վարորդների հիմնական պարտականությունները',
    items: [`
      <h4>Պարտականություններ</h4>
      <p>Հոդվածը սահմանում է վարորդի և սեփականատիրոջ հիմնական իրավական պարտականությունները՝ երթևեկության անվտանգ մասնակցության նպատակով։</p>
      <ul>
        <li>Երթևեկությունը սկսելուց առաջ տեխնիկական ստուգում</li>
        <li>ՃՏՊ դեպքում վարքագծի կանոններ</li>
        <li>Փաստաթղթերի ներկայացում իրավասու մարմիններին</li>
        <li>Արգելված վարքագիծ՝ ոչ սթափ վիճակ, վտանգավոր վարում և այլն</li>
      </ul>
    `],
  },
  {
    title: 'Հոդված 27. Տրանսպորտային միջոցների դասակարգումը և դրանք վարելու իրավունքը',
    items: [`
      <h4>Դասակարգում և վարորդական իրավունքի կարգեր</h4>
      <p>Հոդվածը նկարագրում է տրանսպորտային միջոցների կարգերն ու ենթակարգերը (AM, A, B, C, D, BE, CE, DE և այլն), ինչպես նաև համապատասխան տարիքային և որակավորման պահանջները։</p>
      <p>Ներառում է նաև ազգային/միջազգային վարորդական վկայականների կիրառման և փոխանակման կանոնները։</p>
    `],
  },
  {
    title: 'Հոդված 28. Տրանսպորտային միջոցի վարորդի ուսուցման հիմնական պահանջները',
    items: [`
      <h4>Ուսուցում և որակավորում</h4>
      <p>Հոդվածը սահմանում է վարորդի թեկնածուների ուսուցման, տեսական/գործնական քննությունների, ինչպես նաև բժշկական հավատարմագրման հիմնական կանոնները։</p>
      <ul>
        <li>Տարիքային շեմեր ըստ կարգերի</li>
        <li>Գործնական ուսուցման կազմակերպում</li>
        <li>Ուսումնական տրանսպորտային միջոցների պահանջներ</li>
      </ul>
    `],
  },
];

const normalizeRoadSafetyLawTitle = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeRoadSafetyLawHtml = (html: string): string =>
  html
    .replace(/<hr\s*\/?>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();

const parseRoadSafetyLawSeedFromAccordion = (rawHtml: string): RoadSafetyLawSeedItem[] => {
  if (typeof document === 'undefined' || !rawHtml?.trim()) {
    return [];
  }

  const root = document.createElement('div');
  root.innerHTML = rawHtml;

  const h3Nodes = Array.from(root.querySelectorAll('h3'));
  const sections: RoadSafetyLawSeedItem[] = [];

  for (const h3 of h3Nodes) {
    const title = normalizeRoadSafetyLawTitle(h3.textContent ?? '');
    if (!title) continue;

    const items: string[] = [];
    let node: Element | null = h3.nextElementSibling;

    while (node && node.tagName !== 'H3') {
      const fullLengthBlocks = Array.from(node.querySelectorAll('.full-length'));
      if (fullLengthBlocks.length > 0) {
        for (const block of fullLengthBlocks) {
          const normalizedBlock = normalizeRoadSafetyLawHtml((block as HTMLElement).innerHTML ?? '');
          if (normalizedBlock) {
            items.push(normalizedBlock);
          }
        }
      } else {
        const fallbackBlock = normalizeRoadSafetyLawHtml((node as HTMLElement).innerHTML ?? '');
        if (fallbackBlock) {
          items.push(fallbackBlock);
        }
      }

      node = node.nextElementSibling;
    }

    sections.push({
      title,
      items,
    });
  }

  return sections.filter((section) => section.items.length > 0);
};

const buildRoadSafetyLawSeed = (): RoadSafetyLawSeedItem[] => {
  const parsed = parseRoadSafetyLawSeedFromAccordion(roadSafetyLawAccordionRaw);
  return parsed.length > 0 ? parsed : ROAD_SAFETY_LAW_FALLBACK_SEED;
};

const parseExploitationSeedFromAccordion = (rawHtml: string): ExploitationSeedItem[] => {
  if (typeof document === 'undefined' || !rawHtml?.trim()) {
    return [];
  }

  const root = document.createElement('div');
  root.innerHTML = rawHtml;

  const h3Nodes = Array.from(root.querySelectorAll('h3'));
  const sections: ExploitationSeedItem[] = [];

  for (const h3 of h3Nodes) {
    const title = normalizeRoadSafetyLawTitle(h3.textContent ?? '');
    if (!title) continue;

    const items: string[] = [];
    let node: Element | null = h3.nextElementSibling;

    while (node && node.tagName !== 'H3') {
      const fullLengthBlocks = Array.from(node.querySelectorAll('.full-length'));
      if (fullLengthBlocks.length > 0) {
        for (const block of fullLengthBlocks) {
          const normalizedBlock = normalizeRoadSafetyLawHtml((block as HTMLElement).innerHTML ?? '');
          if (normalizedBlock) {
            items.push(normalizedBlock);
          }
        }
      }

      node = node.nextElementSibling;
    }

    sections.push({
      title,
      items,
    });
  }

  return sections.filter((section) => section.items.length > 0);
};

const buildExploitationSeed = (): ExploitationSeedItem[] => parseExploitationSeedFromAccordion(exploitationAccordionRaw);

const buildRoadMarkingsSeed = (): RoadMarkingSeedChapter[] => {
  const source = Array.isArray(roadMarkingsSeedRaw) ? roadMarkingsSeedRaw : [];

  return source
    .map((chapter: any) => ({
      title: normalizeRoadSafetyLawTitle(String(chapter?.title ?? '')),
      items: Array.isArray(chapter?.items)
        ? chapter.items.map((item: any) => ({
          code: String(item?.code ?? '').trim(),
          contentHtml: normalizeRoadSafetyLawHtml(String(item?.contentHtml ?? '')),
          imageName: String(item?.imageName ?? '').trim(),
        }))
        : [],
    }))
    .map((chapter: RoadMarkingSeedChapter) => ({
      ...chapter,
      items: chapter.items.filter((item: RoadMarkingSeedItem) => item.code && item.contentHtml),
    }))
    .filter((chapter: RoadMarkingSeedChapter) => chapter.title && chapter.items.length > 0);
};

const APP_USER_ID = '1';
const FALLBACK_LANG = '102';
const DEFAULT_EXAM_QUESTION_LIMIT = 20;
const ROAD_CODE_REGEX = /\d+\.\d+(?:\.\d+)?/g;
const ROAD_SIGN_135_CODE = '1.35';
const ROAD_SIGN_135_CATEGORY_ID = '11';
const ROAD_SIGN_135_IMAGE = '1_35.png';
const ROAD_SIGN_135_TITLE_AM = '«Խաչմերուկի տարածք»';
const ROAD_SIGN_135_DESCRIPTION_AM = 'Նշանակում է մոտեցում խաչմերուկին, որի հատվածը նշված է 1.26 գծանշմամբ, և որտեղ արգելվում է մուտք գործել, եթե առջևում՝ երթևեկության ուղղությամբ առաջացել է խցանում, որը վարորդին կհարկադրի կանգ առնել` խոչընդոտ ստեղծելով հատող ճանապարհով լայնական ուղղությամբ տրանսպորտային միջոցների երթևեկության համար, բացառությամբ սույն Կանոններով սահմանված՝ աջ կամ ձախ շրջադարձ կատարելու դեպքերի: 1.35 նշանը տեղադրվում է խաչմերուկի սահմանին: Եթե բարդ խաչմերուկներում հնարավոր չէ ճանապարհային նշանը տեղադրել խաչմերուկի սահմանին, ապա այն տեղադրում են խաչմերուկի սահմանից ոչ ավել, քան 30 մ հեռավորության վրա:';

const extractRoadCodeTokens = (value: string): string[] => {
  const raw = String(value ?? '');
  const matches = raw.match(ROAD_CODE_REGEX) ?? [];
  return Array.from(new Set(matches.map((token) => token.trim()).filter(Boolean)));
};

const resolveRoadSignCode = (rawCode: unknown, rawTitle: unknown): string => {
  const directCode = String(rawCode ?? '').trim();
  if (directCode) {
    return directCode;
  }

  const title = String(rawTitle ?? '').trim();
  const firstToken = extractRoadCodeTokens(title)[0];
  return firstToken ?? '';
};

class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private dbName = 'data';
  private isWeb = Capacitor.getPlatform() === 'web';
  private initPromise: Promise<void> | null = null;
  private languageCandidateIds = ['102', '101', '100'];
  private tableColumnsCache = new Map<string, Set<string>>();
  private roadSafetyLawSeedPromise: Promise<void> | null = null;
  private exploitationSeedPromise: Promise<void> | null = null;
  private roadMarkingsSeedPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (this.isWeb) {
          await this.setupWeb();
        }

        const isConn = await this.sqlite.isConnection(this.dbName, false);
        if (isConn.result) {
          this.db = await this.sqlite.retrieveConnection(this.dbName, false);
        } else {
          this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
        }

        await this.db.open();

        if (this.isWeb) {
          const hasCoreSchema = await this.hasCoreSchema();
          if (!hasCoreSchema) {
            console.warn('Core tables are missing. Restoring database from assets...');
            await this.restoreWebDatabaseFromAssets();
          }
        }

        await this.ensureRoadSafetyLawTablesAndSeed(this.db);
        await this.ensureExploitationTablesAndSeed(this.db);
        await this.ensureRoadMarkingsTablesAndSeed(this.db);
        await this.ensureRoadSign135Exists(this.db);
        await this.ensureUserExamTestsColumns(this.db);
        await this.ensureCleanOfflineProgressState(this.db);

        console.log('Database opened successfully');
      } catch (err) {
        console.error('Error initializing database', err);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  private async setupWeb() {
    let jeepSqliteEl = document.querySelector('jeep-sqlite');
    if (!jeepSqliteEl) {
      const el = document.createElement('jeep-sqlite');
      el.setAttribute('wasmpath', '/assets');
      document.body.appendChild(el);
      jeepSqliteEl = el;
    }

    jeepSqliteEl.setAttribute('wasmpath', '/assets');
    await customElements.whenDefined('jeep-sqlite');

    await this.sqlite.initWebStore();

    const isDatabase = await this.sqlite.isDatabase(this.dbName);
    if (!isDatabase.result) {
      await this.sqlite.copyFromAssets(true);
    }
  }

  private async hasCoreSchema(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const requiredTables = ['questions', 'group_translations'];
      const placeholders = requiredTables.map(() => '?').join(', ');
      const tablesCheck = await this.db.query(
        `SELECT COUNT(*) as count
         FROM sqlite_master
         WHERE type = 'table' AND name IN (${placeholders})`,
        requiredTables,
      );
      const tablesCount = Number(tablesCheck.values?.[0]?.count ?? 0);
      if (tablesCount !== requiredTables.length) {
        return false;
      }

      const questionsCount = await this.db.query('SELECT COUNT(*) as count FROM questions');
      const groupsCount = await this.db.query('SELECT COUNT(*) as count FROM group_translations');
      const testsCount = await this.db.query('SELECT COUNT(*) as count FROM tests');
      const testQuestionsCount = await this.db.query('SELECT COUNT(*) as count FROM test_questions');
      const signsCount = await this.db.query('SELECT COUNT(*) as count FROM road_signs');
      const signTranslationsCount = await this.db.query('SELECT COUNT(*) as count FROM road_sign_translations');
      const pddRulesCount = await this.db.query('SELECT COUNT(*) as count FROM pdd_rules');
      const pddRuleTranslationsCount = await this.db.query('SELECT COUNT(*) as count FROM pdd_rule_translations');
      const exploitationTranslationsCount = await this.db.query('SELECT COUNT(*) as count FROM exploitation_translations');
      const qCount = Number(questionsCount.values?.[0]?.count ?? 0);
      const gCount = Number(groupsCount.values?.[0]?.count ?? 0);
      const tCount = Number(testsCount.values?.[0]?.count ?? 0);
      const tqCount = Number(testQuestionsCount.values?.[0]?.count ?? 0);
      const rsCount = Number(signsCount.values?.[0]?.count ?? 0);
      const rstCount = Number(signTranslationsCount.values?.[0]?.count ?? 0);
      const prCount = Number(pddRulesCount.values?.[0]?.count ?? 0);
      const prtCount = Number(pddRuleTranslationsCount.values?.[0]?.count ?? 0);
      const etCount = Number(exploitationTranslationsCount.values?.[0]?.count ?? 0);

      // Ensure we don't keep an incomplete web DB snapshot.
      return (
        qCount >= 1000 &&
        gCount >= 10 &&
        tCount >= 62 &&
        tqCount >= 1200 &&
        rsCount >= 280 &&
        rstCount >= 840 &&
        prCount >= 200 &&
        prtCount >= 390 &&
        etCount >= 12
      );
    } catch {
      return false;
    }
  }

  private async restoreWebDatabaseFromAssets(): Promise<void> {
    let conn: SQLiteDBConnection;
    const isConn = await this.sqlite.isConnection(this.dbName, false);
    if (isConn.result) {
      conn = await this.sqlite.retrieveConnection(this.dbName, false);
    } else {
      conn = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
    }

    try {
      const isOpen = await conn.isDBOpen();
      if (isOpen.result) {
        await conn.close();
      }
    } catch {}

    try {
      await conn.delete();
    } catch {}

    try {
      await this.sqlite.closeConnection(this.dbName, false);
    } catch {}

    await this.sqlite.copyFromAssets(true);

    this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
    await this.db.open();
  }

  private async ensureDb() {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  private async tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
    const key = tableName.toLowerCase();
    let columns = this.tableColumnsCache.get(key);

    if (!columns) {
      const db = await this.ensureDb();
      const info = await db.query(`PRAGMA table_info(${tableName})`);
      columns = new Set(
        (info.values ?? [])
          .map((row: DbRow) => String(row.name ?? '').toLowerCase())
          .filter(Boolean),
      );
      this.tableColumnsCache.set(key, columns);
    }

    return columns.has(columnName.toLowerCase());
  }

  private toInt(value: any, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private toBool(value: any): boolean {
    return this.toInt(value, 0) === 1;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private makeUniqueId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async getNextTableId(tableName: string): Promise<number> {
    const db = await this.ensureDb();
    const row = await db.query(`SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 as next_id FROM ${tableName}`);
    return this.toInt(row.values?.[0]?.next_id, 1);
  }

  private async resolveLanguageIdForTable(tableName: string, preferredLangId: number): Promise<string> {
    const db = await this.ensureDb();

    const hasRowsFor = async (langId: string): Promise<boolean> => {
      const check = await db.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE CAST(language_id AS TEXT) = ?`,
        [langId],
      );
      return this.toInt(check.values?.[0]?.count, 0) > 0;
    };

    const candidates = [String(preferredLangId), ...this.languageCandidateIds];
    for (const langId of candidates) {
      if (langId && (await hasRowsFor(langId))) {
        return langId;
      }
    }

    const any = await db.query(
      `SELECT CAST(language_id AS TEXT) as language_id FROM ${tableName} GROUP BY language_id ORDER BY CAST(language_id AS INTEGER) LIMIT 1`,
    );
    return String(any.values?.[0]?.language_id ?? FALLBACK_LANG);
  }

  private async resolveColumnName(tableName: string, candidates: string[], fallback: string): Promise<string> {
    for (const candidate of candidates) {
      if (await this.tableHasColumn(tableName, candidate)) {
        return candidate;
      }
    }
    return fallback;
  }

  private async ensureRoadSafetyLawTablesAndSeed(dbConnection?: SQLiteDBConnection): Promise<void> {
    if (this.roadSafetyLawSeedPromise) {
      await this.roadSafetyLawSeedPromise;
      return;
    }

    this.roadSafetyLawSeedPromise = (async () => {
      const db = dbConnection ?? await this.ensureDb();

      await db.run(`
        CREATE TABLE IF NOT EXISTS road_safety_law_chapters (
          id TEXT PRIMARY KEY,
          language_id TEXT NOT NULL,
          title TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS road_safety_law_articles (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          language_id TEXT NOT NULL,
          content_html TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_rs_law_chapters_lang ON road_safety_law_chapters(language_id, sort_order)',
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_rs_law_articles_chapter ON road_safety_law_articles(chapter_id, language_id, sort_order)',
      );

      const seedSections = buildRoadSafetyLawSeed();
      if (seedSections.length === 0) {
        return;
      }

      const expectedItemsByTitle = new Map<string, string[]>(
        seedSections.map((section) => [
          normalizeRoadSafetyLawTitle(section.title),
          section.items
            .map((item) => normalizeRoadSafetyLawHtml(item))
            .filter(Boolean),
        ]),
      );

      const now = this.nowIso();
      const existingByTitleRes = await db.query(
        `SELECT
            c.id as id,
            c.title as title,
            CAST(c.sort_order AS INTEGER) as sort_order,
            COUNT(a.id) as items_count
         FROM road_safety_law_chapters c
         LEFT JOIN road_safety_law_articles a
           ON CAST(a.chapter_id AS TEXT) = CAST(c.id AS TEXT)
          AND CAST(a.language_id AS TEXT) = CAST(c.language_id AS TEXT)
         WHERE CAST(c.language_id AS TEXT) = ?
         GROUP BY c.id, c.title, c.sort_order`,
        [FALLBACK_LANG],
      );

      const existingByTitle = new Map<
        string,
        { id: string; title: string; sortOrder: number; itemsCount: number }
      >(
        (existingByTitleRes.values ?? []).map((row: DbRow) => [
          normalizeRoadSafetyLawTitle(String(row.title ?? '')),
          {
            id: String(row.id ?? ''),
            title: String(row.title ?? ''),
            sortOrder: this.toInt(row.sort_order, 0),
            itemsCount: this.toInt(row.items_count, 0),
          },
        ]),
      );

      const existingItemsByChapterId = new Map<string, string[]>();
      const loadExistingItems = async (chapterId: string): Promise<string[]> => {
        const cached = existingItemsByChapterId.get(chapterId);
        if (cached) {
          return cached;
        }

        const res = await db.query(
          `SELECT content_html
           FROM road_safety_law_articles
           WHERE CAST(chapter_id AS TEXT) = ?
             AND CAST(language_id AS TEXT) = ?
           ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
          [chapterId, FALLBACK_LANG],
        );

        const items = (res.values ?? [])
          .map((row: DbRow) => normalizeRoadSafetyLawHtml(String(row.content_html ?? '')))
          .filter(Boolean);

        existingItemsByChapterId.set(chapterId, items);
        return items;
      };

      const arraysEqual = (left: string[], right: string[]): boolean => {
        if (left.length !== right.length) {
          return false;
        }
        for (let i = 0; i < left.length; i += 1) {
          if (left[i] !== right[i]) {
            return false;
          }
        }
        return true;
      };

      const hasAnyRows = existingByTitle.size > 0;
      let needsAnyUpdate = !hasAnyRows;

      if (!needsAnyUpdate) {
        for (let i = 0; i < seedSections.length; i += 1) {
          const seed = seedSections[i];
          const normalizedTitle = normalizeRoadSafetyLawTitle(seed.title);
          const expectedItems = expectedItemsByTitle.get(normalizedTitle) ?? [];
          const existing = existingByTitle.get(normalizedTitle);

          if (!existing) {
            needsAnyUpdate = true;
            break;
          }

          if (existing.title !== seed.title || existing.sortOrder !== i + 1) {
            needsAnyUpdate = true;
            break;
          }

          const existingItems = await loadExistingItems(existing.id);
          if (!arraysEqual(existingItems, expectedItems)) {
            needsAnyUpdate = true;
            break;
          }
        }
      }

      if (!needsAnyUpdate) {
        return;
      }

      let nextChapterId = await this.getNextTableId('road_safety_law_chapters');
      let nextArticleId = await this.getNextTableId('road_safety_law_articles');

      const insertArticlesForChapter = async (chapterId: string, items: string[]) => {
        let sortOrder = 1;
        for (const contentHtml of items) {
          await db.run(
            `INSERT OR REPLACE INTO road_safety_law_articles (id, chapter_id, language_id, content_html, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [String(nextArticleId), chapterId, FALLBACK_LANG, contentHtml, String(sortOrder), now, now],
          );
          nextArticleId += 1;
          sortOrder += 1;
        }
      };

      for (let i = 0; i < seedSections.length; i += 1) {
        const seed = seedSections[i];
        const normalizedTitle = normalizeRoadSafetyLawTitle(seed.title);
        const expectedItems = expectedItemsByTitle.get(normalizedTitle) ?? [];
        const existing = existingByTitle.get(normalizedTitle);

        if (!existing) {
          const chapterId = String(nextChapterId);
          nextChapterId += 1;

          await db.run(
            `INSERT OR REPLACE INTO road_safety_law_chapters (id, language_id, title, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [chapterId, FALLBACK_LANG, seed.title, String(i + 1), now, now],
          );

          if (expectedItems.length > 0) {
            await insertArticlesForChapter(chapterId, expectedItems);
          }
          continue;
        }

        await db.run(
          `UPDATE road_safety_law_chapters
           SET title = ?, sort_order = ?, updated_at = ?
           WHERE CAST(id AS TEXT) = ? AND CAST(language_id AS TEXT) = ?`,
          [seed.title, String(i + 1), now, existing.id, FALLBACK_LANG],
        );

        const existingItems = await loadExistingItems(existing.id);
        const shouldReplaceItems = !arraysEqual(existingItems, expectedItems);

        if (shouldReplaceItems) {
          await db.run(
            'DELETE FROM road_safety_law_articles WHERE CAST(chapter_id AS TEXT) = ? AND CAST(language_id AS TEXT) = ?',
            [existing.id, FALLBACK_LANG],
          );

          if (expectedItems.length > 0) {
            await insertArticlesForChapter(existing.id, expectedItems);
          }
        }
      }
    })();

    try {
      await this.roadSafetyLawSeedPromise;
    } finally {
      this.roadSafetyLawSeedPromise = null;
    }
  }

  private async ensureExploitationTablesAndSeed(dbConnection?: SQLiteDBConnection): Promise<void> {
    if (this.exploitationSeedPromise) {
      await this.exploitationSeedPromise;
      return;
    }

    this.exploitationSeedPromise = (async () => {
      const db = dbConnection ?? await this.ensureDb();

      await db.run(`
        CREATE TABLE IF NOT EXISTS exploitation_chapters (
          id TEXT PRIMARY KEY,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS exploitation_chapter_translations (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          language_id TEXT NOT NULL,
          title TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS exploitations (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS exploitation_translations (
          id TEXT PRIMARY KEY,
          exploitation_id TEXT NOT NULL,
          language_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      const seedSections = buildExploitationSeed();
      if (seedSections.length === 0) {
        return;
      }

      const now = this.nowIso();
      let nextChapterTranslationId = await this.getNextTableId('exploitation_chapter_translations');
      let nextExploitationId = await this.getNextTableId('exploitations');
      let nextExploitationTranslationId = await this.getNextTableId('exploitation_translations');

      const arraysEqual = (left: string[], right: string[]): boolean => {
        if (left.length !== right.length) {
          return false;
        }
        for (let i = 0; i < left.length; i += 1) {
          if (left[i] !== right[i]) {
            return false;
          }
        }
        return true;
      };

      const upsertChapterTranslation = async (chapterId: string, languageId: string, title: string) => {
        const existing = await db.query(
          `SELECT id
           FROM exploitation_chapter_translations
           WHERE CAST(chapter_id AS TEXT) = ?
             AND CAST(language_id AS TEXT) = ?
           ORDER BY CAST(id AS INTEGER)
           LIMIT 1`,
          [chapterId, languageId],
        );

        const existingId = String(existing.values?.[0]?.id ?? '');
        if (existingId) {
          await db.run(
            `UPDATE exploitation_chapter_translations
             SET title = ?, updated_at = ?
             WHERE CAST(id AS TEXT) = ?`,
            [title, now, existingId],
          );
          return;
        }

        await db.run(
          `INSERT OR REPLACE INTO exploitation_chapter_translations (id, chapter_id, language_id, title, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [String(nextChapterTranslationId), chapterId, languageId, title, now, now],
        );
        nextChapterTranslationId += 1;
      };

      const loadExistingItemsForChapter = async (chapterId: string): Promise<string[]> => {
        const res = await db.query(
          `SELECT et.content as content
           FROM exploitations e
           LEFT JOIN exploitation_translations et
             ON CAST(et.exploitation_id AS TEXT) = CAST(e.id AS TEXT)
            AND CAST(et.language_id AS TEXT) = ?
           WHERE CAST(e.chapter_id AS TEXT) = ?
           ORDER BY CAST(e.id AS INTEGER)`,
          [FALLBACK_LANG, chapterId],
        );

        return (res.values ?? [])
          .map((row: DbRow) => normalizeRoadSafetyLawHtml(String(row.content ?? '')))
          .filter(Boolean);
      };

      const replaceChapterItems = async (chapterId: string, items: string[]) => {
        const existingExploitations = await db.query(
          `SELECT id
           FROM exploitations
           WHERE CAST(chapter_id AS TEXT) = ?
           ORDER BY CAST(id AS INTEGER)`,
          [chapterId],
        );

        for (const row of existingExploitations.values ?? []) {
          const exploitationId = String(row.id ?? '');
          if (!exploitationId) continue;
          await db.run(
            'DELETE FROM exploitation_translations WHERE CAST(exploitation_id AS TEXT) = ?',
            [exploitationId],
          );
        }

        await db.run('DELETE FROM exploitations WHERE CAST(chapter_id AS TEXT) = ?', [chapterId]);

        for (const content of items) {
          const exploitationId = String(nextExploitationId);
          nextExploitationId += 1;

          await db.run(
            `INSERT OR REPLACE INTO exploitations (id, chapter_id, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [exploitationId, chapterId, now, now],
          );

          for (const languageId of [FALLBACK_LANG, '101']) {
            await db.run(
              `INSERT OR REPLACE INTO exploitation_translations (id, exploitation_id, language_id, content, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [String(nextExploitationTranslationId), exploitationId, languageId, content, now, now],
            );
            nextExploitationTranslationId += 1;
          }
        }
      };

      for (let i = 0; i < seedSections.length; i += 1) {
        const chapterId = String(i + 1);
        const seed = seedSections[i];
        const expectedItems = seed.items
          .map((item) => normalizeRoadSafetyLawHtml(item))
          .filter(Boolean);

        await db.run(
          `INSERT OR IGNORE INTO exploitation_chapters (id, created_at, updated_at)
           VALUES (?, ?, ?)`,
          [chapterId, now, now],
        );
        await db.run(
          `UPDATE exploitation_chapters
           SET updated_at = ?
           WHERE CAST(id AS TEXT) = ?`,
          [now, chapterId],
        );

        await upsertChapterTranslation(chapterId, FALLBACK_LANG, seed.title);

        const countRes = await db.query(
          `SELECT COUNT(*) as count
           FROM exploitations
           WHERE CAST(chapter_id AS TEXT) = ?`,
          [chapterId],
        );
        const existingCount = this.toInt(countRes.values?.[0]?.count, 0);
        const existingItems = await loadExistingItemsForChapter(chapterId);
        const shouldReplace = existingCount !== expectedItems.length || !arraysEqual(existingItems, expectedItems);

        if (shouldReplace) {
          await replaceChapterItems(chapterId, expectedItems);
        }
      }
    })();

    try {
      await this.exploitationSeedPromise;
    } finally {
      this.exploitationSeedPromise = null;
    }
  }

  private async ensureRoadMarkingsTablesAndSeed(dbConnection?: SQLiteDBConnection): Promise<void> {
    if (this.roadMarkingsSeedPromise) {
      await this.roadMarkingsSeedPromise;
      return;
    }

    this.roadMarkingsSeedPromise = (async () => {
      const db = dbConnection ?? await this.ensureDb();

      await db.run(`
        CREATE TABLE IF NOT EXISTS road_marking_chapters (
          id TEXT PRIMARY KEY,
          language_id TEXT NOT NULL,
          title TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS road_marking_items (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          language_id TEXT NOT NULL,
          code TEXT NOT NULL,
          content_html TEXT NOT NULL,
          image_name TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT,
          updated_at TEXT
        )
      `);

      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_road_marking_chapters_lang ON road_marking_chapters(language_id, sort_order)',
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_road_marking_items_chapter ON road_marking_items(chapter_id, language_id, sort_order)',
      );

      const seed = buildRoadMarkingsSeed();
      if (seed.length === 0) {
        return;
      }

      const expected = seed.map((chapter, chapterIndex) => ({
        title: chapter.title,
        sortOrder: chapterIndex + 1,
        items: chapter.items.map((item) => ({
          code: item.code.trim(),
          contentHtml: normalizeRoadSafetyLawHtml(item.contentHtml),
          imageName: String(item.imageName ?? '').trim(),
        })),
      }));

      const existingChaptersRes = await db.query(
        `SELECT
            CAST(id AS INTEGER) as id,
            title,
            CAST(sort_order AS INTEGER) as sort_order
         FROM road_marking_chapters
         WHERE CAST(language_id AS TEXT) = ?
         ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
        [FALLBACK_LANG],
      );

      const existingChapters = (existingChaptersRes.values ?? []).map((row: DbRow) => ({
        id: this.toInt(row.id, 0),
        title: normalizeRoadSafetyLawTitle(String(row.title ?? '')),
        sortOrder: this.toInt(row.sort_order, 0),
      }));

      const loadExistingItems = async (chapterId: number) => {
        const res = await db.query(
          `SELECT
              code,
              content_html,
              image_name
           FROM road_marking_items
           WHERE CAST(chapter_id AS TEXT) = ?
             AND CAST(language_id AS TEXT) = ?
           ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
          [String(chapterId), FALLBACK_LANG],
        );

        return (res.values ?? []).map((row: DbRow) => ({
          code: String(row.code ?? '').trim(),
          contentHtml: normalizeRoadSafetyLawHtml(String(row.content_html ?? '')),
          imageName: String(row.image_name ?? '').trim(),
        }));
      };

      let needsReseed = existingChapters.length !== expected.length;

      if (!needsReseed) {
        for (let i = 0; i < expected.length; i += 1) {
          const expectedChapter = expected[i];
          const existingChapter = existingChapters[i];

          if (!existingChapter) {
            needsReseed = true;
            break;
          }

          if (existingChapter.title !== expectedChapter.title || existingChapter.sortOrder !== expectedChapter.sortOrder) {
            needsReseed = true;
            break;
          }

          const existingItems = await loadExistingItems(existingChapter.id);
          if (existingItems.length !== expectedChapter.items.length) {
            needsReseed = true;
            break;
          }

          for (let j = 0; j < expectedChapter.items.length; j += 1) {
            const left = expectedChapter.items[j];
            const right = existingItems[j];

            if (!right || left.code !== right.code || left.contentHtml !== right.contentHtml || left.imageName !== right.imageName) {
              needsReseed = true;
              break;
            }
          }

          if (needsReseed) {
            break;
          }
        }
      }

      if (!needsReseed) {
        return;
      }

      const now = this.nowIso();
      await db.run('DELETE FROM road_marking_items');
      await db.run('DELETE FROM road_marking_chapters');

      let nextItemId = 1;
      for (let chapterIndex = 0; chapterIndex < expected.length; chapterIndex += 1) {
        const chapter = expected[chapterIndex];
        const chapterId = String(chapterIndex + 1);

        await db.run(
          `INSERT INTO road_marking_chapters (id, language_id, title, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [chapterId, FALLBACK_LANG, chapter.title, String(chapter.sortOrder), now, now],
        );

        for (let itemIndex = 0; itemIndex < chapter.items.length; itemIndex += 1) {
          const item = chapter.items[itemIndex];
          await db.run(
            `INSERT INTO road_marking_items (id, chapter_id, language_id, code, content_html, image_name, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              String(nextItemId),
              chapterId,
              FALLBACK_LANG,
              item.code,
              item.contentHtml,
              item.imageName,
              String(itemIndex + 1),
              now,
              now,
            ],
          );
          nextItemId += 1;
        }
      }
    })();

    try {
      await this.roadMarkingsSeedPromise;
    } finally {
      this.roadMarkingsSeedPromise = null;
    }
  }

  private async ensureRoadSign135Exists(dbConnection?: SQLiteDBConnection): Promise<void> {
    const db = dbConnection ?? await this.ensureDb();
    const signFk = (await this.tableHasColumn('road_sign_translations', 'road_sign_id'))
      ? 'road_sign_id'
      : 'sign_id';
    const hasCodeColumn = await this.tableHasColumn('road_sign_translations', 'code');

    let signId = 0;
    if (hasCodeColumn) {
      const byCode = await db.query(
        `SELECT CAST(${signFk} AS INTEGER) as sign_id
         FROM road_sign_translations
         WHERE code = ?
         LIMIT 1`,
        [ROAD_SIGN_135_CODE],
      );
      signId = this.toInt(byCode.values?.[0]?.sign_id, 0);
    } else {
      const byTitle = await db.query(
        `SELECT CAST(${signFk} AS INTEGER) as sign_id
         FROM road_sign_translations
         WHERE title LIKE ?
         LIMIT 1`,
        [`%${ROAD_SIGN_135_CODE}%`],
      );
      signId = this.toInt(byTitle.values?.[0]?.sign_id, 0);
    }

    if (signId <= 0) {
      const byImage = await db.query(
        `SELECT CAST(id AS INTEGER) as id
         FROM road_signs
         WHERE TRIM(COALESCE(image, '')) = ?
         LIMIT 1`,
        [ROAD_SIGN_135_IMAGE],
      );
      signId = this.toInt(byImage.values?.[0]?.id, 0);
    }

    const now = this.nowIso();
    if (signId <= 0) {
      const nextSignIdRes = await db.query(
        'SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 as next_id FROM road_signs',
      );
      signId = this.toInt(nextSignIdRes.values?.[0]?.next_id, 1);

      await db.run(
        `INSERT INTO road_signs (id, category_id, image, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [String(signId), ROAD_SIGN_135_CATEGORY_ID, ROAD_SIGN_135_IMAGE, now, now],
      );
    } else {
      await db.run(
        `UPDATE road_signs
         SET category_id = ?, image = ?, updated_at = ?
         WHERE CAST(id AS TEXT) = ?`,
        [ROAD_SIGN_135_CATEGORY_ID, ROAD_SIGN_135_IMAGE, now, String(signId)],
      );
    }

    const existingTranslationsRes = await db.query(
      `SELECT CAST(id AS INTEGER) as id, CAST(language_id AS TEXT) as language_id
       FROM road_sign_translations
       WHERE CAST(${signFk} AS TEXT) = ?`,
      [String(signId)],
    );

    const existingByLang = new Map<string, number>(
      (existingTranslationsRes.values ?? []).map((row: DbRow) => [
        String(row.language_id ?? ''),
        this.toInt(row.id, 0),
      ]),
    );

    const upsertTranslation = async (languageId: string, title: string, description: string) => {
      const existingId = existingByLang.get(languageId) ?? 0;
      if (existingId > 0) {
        if (hasCodeColumn) {
          await db.run(
            `UPDATE road_sign_translations
             SET title = ?, description = ?, code = ?, updated_at = ?
             WHERE CAST(id AS TEXT) = ?`,
            [title, description, ROAD_SIGN_135_CODE, now, String(existingId)],
          );
        } else {
          await db.run(
            `UPDATE road_sign_translations
             SET title = ?, description = ?, updated_at = ?
             WHERE CAST(id AS TEXT) = ?`,
            [title, description, now, String(existingId)],
          );
        }
        return;
      }

      const nextTranslationIdRes = await db.query(
        'SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 as next_id FROM road_sign_translations',
      );
      const translationId = this.toInt(nextTranslationIdRes.values?.[0]?.next_id, 1);

      if (hasCodeColumn) {
        await db.run(
          `INSERT INTO road_sign_translations (id, ${signFk}, language_id, title, description, created_at, updated_at, code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(translationId),
            String(signId),
            languageId,
            title,
            description,
            now,
            now,
            ROAD_SIGN_135_CODE,
          ],
        );
      } else {
        await db.run(
          `INSERT INTO road_sign_translations (id, ${signFk}, language_id, title, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [String(translationId), String(signId), languageId, title, description, now, now],
        );
      }
    };

    await upsertTranslation('100', ROAD_SIGN_135_CODE, '"Intersection area".');
    await upsertTranslation('101', ROAD_SIGN_135_CODE, '«Зона перекрестка».');
    await upsertTranslation('102', ROAD_SIGN_135_TITLE_AM, ROAD_SIGN_135_DESCRIPTION_AM);
  }

  private async ensureCleanOfflineProgressState(dbConnection?: SQLiteDBConnection): Promise<void> {
    const db = dbConnection ?? await this.ensureDb();

    const foreignRowsRes = await db.query(
      `SELECT
          (
            SELECT COUNT(*) FROM favorite_questions
            WHERE TRIM(COALESCE(CAST(user_id AS TEXT), '')) <> ?
          ) +
          (
            SELECT COUNT(*) FROM user_statistics
            WHERE TRIM(COALESCE(CAST(user_id AS TEXT), '')) <> ?
          ) +
          (
            SELECT COUNT(*) FROM user_exam_tests
            WHERE TRIM(COALESCE(CAST(user_id AS TEXT), '')) <> ?
          ) as foreign_rows`,
      [APP_USER_ID, APP_USER_ID, APP_USER_ID],
    );

    const foreignRows = this.toInt(foreignRowsRes.values?.[0]?.foreign_rows, 0);
    if (foreignRows <= 0) {
      return;
    }

    await db.run('DELETE FROM favorite_questions');
    await db.run('DELETE FROM user_exam_test_questions');
    await db.run('DELETE FROM user_exam_tests');
    await db.run('DELETE FROM user_statistics');
  }

  private async ensureUserExamTestsColumns(dbConnection?: SQLiteDBConnection): Promise<void> {
    const db = dbConnection ?? await this.ensureDb();

    const tableRes = await db.query(
      `SELECT COUNT(*) as count
       FROM sqlite_master
       WHERE type = 'table' AND name = 'user_exam_tests'`,
    );
    if (this.toInt(tableRes.values?.[0]?.count, 0) <= 0) {
      return;
    }

    const ensureColumn = async (columnName: string, definition: string) => {
      const hasColumn = await this.tableHasColumn('user_exam_tests', columnName);
      if (hasColumn) {
        return;
      }

      await db.run(`ALTER TABLE user_exam_tests ADD COLUMN ${columnName} ${definition}`);

      const cacheKey = 'user_exam_tests';
      let knownColumns = this.tableColumnsCache.get(cacheKey);
      if (!knownColumns) {
        knownColumns = new Set<string>();
        this.tableColumnsCache.set(cacheKey, knownColumns);
      }
      knownColumns.add(columnName.toLowerCase());
    };

    await ensureColumn('correct_answers', "TEXT DEFAULT '0'");
    await ensureColumn('total_questions', "TEXT DEFAULT '0'");

    const answersTableRes = await db.query(
      `SELECT COUNT(*) as count
       FROM sqlite_master
       WHERE type = 'table' AND name = 'user_exam_test_questions'`,
    );

    if (this.toInt(answersTableRes.values?.[0]?.count, 0) > 0) {
      await db.run(
        `UPDATE user_exam_tests
         SET correct_answers = (
               SELECT COUNT(*)
               FROM user_exam_test_questions q
               WHERE CAST(q.user_exam_test_id AS TEXT) = CAST(user_exam_tests.id AS TEXT)
                 AND CAST(COALESCE(q.is_right, '0') AS INTEGER) = 1
             ),
             total_questions = (
               SELECT COUNT(*)
               FROM user_exam_test_questions q
               WHERE CAST(q.user_exam_test_id AS TEXT) = CAST(user_exam_tests.id AS TEXT)
             )
         WHERE CAST(COALESCE(is_completed, '0') AS INTEGER) = 1
           AND EXISTS (
             SELECT 1
             FROM user_exam_test_questions q
             WHERE CAST(q.user_exam_test_id AS TEXT) = CAST(user_exam_tests.id AS TEXT)
           )
           AND (
             correct_answers IS NULL
             OR TRIM(CAST(correct_answers AS TEXT)) = ''
             OR CAST(COALESCE(correct_answers, '0') AS INTEGER) = 0
           )`,
      );
    }
  }

  private async loadAnswersForQuestion(questionId: number, langId: number): Promise<AnswerOption[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('answer_translations', langId);

    const res = await db.query(
      `SELECT
          CAST(a.id AS INTEGER) as id,
          CAST(a.is_right AS INTEGER) as is_right,
          at.title as title
       FROM answers a
       JOIN answer_translations at ON CAST(a.id AS TEXT) = CAST(at.answer_id AS TEXT)
       WHERE CAST(a.question_id AS TEXT) = ?
         AND CAST(at.language_id AS TEXT) = ?
       ORDER BY CAST(a.id AS INTEGER)`,
      [String(questionId), resolvedLangId],
    );

    const rows = res.values ?? [];
    return rows.map((row: DbRow) => ({
      id: this.toInt(row.id),
      is_right: this.toBool(row.is_right),
      title: String(row.title ?? ''),
    }));
  }

  private async loadQuestionsByIds(questionIds: number[], langId: number): Promise<QuestionItem[]> {
    if (questionIds.length === 0) return [];

    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('question_translations', langId);

    const placeholders = questionIds.map(() => '?').join(', ');
    const rowsRes = await db.query(
      `SELECT
          CAST(q.id AS INTEGER) as id,
          q.image as image,
          CAST(q.group_id AS INTEGER) as group_id,
          qt.title as title
       FROM questions q
       LEFT JOIN question_translations qt
         ON CAST(q.id AS TEXT) = CAST(qt.question_id AS TEXT)
        AND CAST(qt.language_id AS TEXT) = ?
       WHERE CAST(q.id AS TEXT) IN (${placeholders})`,
      [resolvedLangId, ...questionIds.map(String)],
    );

    const rows = rowsRes.values ?? [];
    const byId = new Map<number, DbRow>();
    for (const row of rows) {
      byId.set(this.toInt(row.id), row);
    }

    const output: QuestionItem[] = [];
    for (const qId of questionIds) {
      const row = byId.get(qId);
      if (!row) continue;

      const answers = await this.loadAnswersForQuestion(qId, langId);
      output.push({
        id: qId,
        image: row.image ? String(row.image) : null,
        group_id: row.group_id !== null && row.group_id !== undefined ? this.toInt(row.group_id, 0) : null,
        title: String(row.title ?? ''),
        answers,
      });
    }

    return output;
  }

  async saveUserAnswer(questionId: number, answerId: number | null, groupId: number | null, isCorrect: boolean): Promise<void> {
    const db = await this.ensureDb();
    const nextId = await this.getNextTableId('user_statistics');
    const now = this.nowIso();

    await db.run(
      `INSERT INTO user_statistics
        (id, user_id, question_id, answer_id, group_id, is_right, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nextId),
        APP_USER_ID,
        String(questionId),
        answerId !== null ? String(answerId) : '',
        groupId !== null ? String(groupId) : '',
        isCorrect ? '1' : '0',
        now,
        now,
      ],
    );
  }

  async startExamTestSession(testId: number): Promise<number> {
    const db = await this.ensureDb();
    const nextId = await this.getNextTableId('user_exam_tests');
    const now = this.nowIso();

    await db.run(
      `INSERT INTO user_exam_tests
        (id, user_id, test_id, unique_id, is_completed, finish_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nextId),
        APP_USER_ID,
        String(testId),
        this.makeUniqueId(),
        '0',
        '',
        now,
        now,
      ],
    );

    return nextId;
  }

  async saveExamTestAnswer(
    userExamTestId: number,
    testId: number,
    questionId: number,
    answerId: number | null,
    isCorrect: boolean,
  ): Promise<void> {
    if (userExamTestId <= 0) return;

    const db = await this.ensureDb();
    const now = this.nowIso();

    const linkRes = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM test_questions
       WHERE CAST(test_id AS TEXT) = ?
         AND CAST(question_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER)
       LIMIT 1`,
      [String(testId), String(questionId)],
    );
    const testQuestionId = this.toInt(linkRes.values?.[0]?.id, 0);
    if (testQuestionId <= 0) {
      return;
    }

    const existingRes = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM user_exam_test_questions
       WHERE CAST(user_exam_test_id AS TEXT) = ?
         AND CAST(test_question_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER) DESC
       LIMIT 1`,
      [String(userExamTestId), String(testQuestionId)],
    );
    const existingId = this.toInt(existingRes.values?.[0]?.id, 0);

    if (existingId > 0) {
      await db.run(
        `UPDATE user_exam_test_questions
         SET test_answer_id = ?, is_right = ?, updated_at = ?
         WHERE CAST(id AS TEXT) = ?`,
        [answerId !== null ? String(answerId) : '', isCorrect ? '1' : '0', now, String(existingId)],
      );
      return;
    }

    const nextId = await this.getNextTableId('user_exam_test_questions');
    await db.run(
      `INSERT INTO user_exam_test_questions
        (id, user_exam_test_id, test_question_id, test_answer_id, is_right, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nextId),
        String(userExamTestId),
        String(testQuestionId),
        answerId !== null ? String(answerId) : '',
        isCorrect ? '1' : '0',
        now,
        now,
      ],
    );
  }

  async completeExamTestSession(
    userExamTestId: number | null,
    testId: number,
    correctAnswers: number,
    totalQuestions: number,
    elapsedSeconds: number,
  ): Promise<void> {
    if (!userExamTestId || userExamTestId <= 0) {
      await this.recordExamTestCompletion(testId, correctAnswers, totalQuestions, elapsedSeconds);
      return;
    }

    const db = await this.ensureDb();
    const now = this.nowIso();
    await db.run(
      `UPDATE user_exam_tests
       SET user_id = ?,
           test_id = ?,
           is_completed = ?,
           correct_answers = ?,
           total_questions = ?,
           finish_time = ?,
           updated_at = ?
       WHERE CAST(id AS TEXT) = ?`,
      [
        APP_USER_ID,
        String(testId),
        '1',
        String(Math.max(0, correctAnswers)),
        String(Math.max(0, totalQuestions)),
        String(Math.max(0, elapsedSeconds)),
        now,
        String(userExamTestId),
      ],
    );
  }

  async recordExamTestCompletion(
    testId: number,
    correctAnswers: number,
    totalQuestions: number,
    elapsedSeconds?: number,
  ): Promise<void> {
    const db = await this.ensureDb();
    const nextId = await this.getNextTableId('user_exam_tests');
    const now = this.nowIso();

    await db.run(
      `INSERT INTO user_exam_tests
        (id, user_id, test_id, unique_id, is_completed, correct_answers, total_questions, finish_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nextId),
        APP_USER_ID,
        String(testId),
        this.makeUniqueId(),
        '1',
        String(Math.max(0, correctAnswers)),
        String(Math.max(0, totalQuestions)),
        String(
          typeof elapsedSeconds === 'number'
            ? Math.max(0, Math.round(elapsedSeconds))
            : Math.max(0, totalQuestions - correctAnswers),
        ),
        now,
        now,
      ],
    );
  }

  private async getLatestUserAnswersMap(): Promise<Map<number, DbRow>> {
    const db = await this.ensureDb();
    const res = await db.query(
      `SELECT id, question_id, answer_id, group_id, is_right, updated_at
       FROM user_statistics
       WHERE CAST(user_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER) DESC`,
      [APP_USER_ID],
    );

    const latest = new Map<number, DbRow>();
    for (const row of res.values ?? []) {
      const qId = this.toInt(row.question_id, 0);
      if (!qId || latest.has(qId)) continue;
      latest.set(qId, row);
    }
    return latest;
  }

  async clearUserStatistics(): Promise<void> {
    const db = await this.ensureDb();

    const sessionsRes = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM user_exam_tests
       WHERE CAST(user_id AS TEXT) = ?`,
      [APP_USER_ID],
    );

    const sessionIds = (sessionsRes.values ?? [])
      .map((row: DbRow) => this.toInt(row.id, 0))
      .filter((id) => id > 0);

    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(', ');
      await db.run(
        `DELETE FROM user_exam_test_questions
         WHERE CAST(user_exam_test_id AS TEXT) IN (${placeholders})`,
        sessionIds.map(String),
      );
    }

    await db.run(
      `DELETE FROM user_exam_tests
       WHERE CAST(user_id AS TEXT) = ?`,
      [APP_USER_ID],
    );

    await db.run(
      `DELETE FROM user_statistics
       WHERE CAST(user_id AS TEXT) = ?`,
      [APP_USER_ID],
    );
  }

  async getStats(): Promise<StatsSummary> {
    const db = await this.ensureDb();

    const totalQuestionsRes = await db.query('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = this.toInt(totalQuestionsRes.values?.[0]?.count, 0);

    const totalExamTestsRes = await db.query(
      `SELECT COUNT(*) as count
       FROM tests
       WHERE deleted_at IS NULL OR CAST(deleted_at AS TEXT) = ''`,
    );
    const ticketsTotal = this.toInt(totalExamTestsRes.values?.[0]?.count, 0);

    const latestAnswers = await this.getLatestUserAnswersMap();
    const answered = latestAnswers.size;
    let errors = 0;
    let correct = 0;
    for (const row of latestAnswers.values()) {
      if (this.toBool(row.is_right)) {
        correct += 1;
      } else {
        errors += 1;
      }
    }

    const completedTicketsRes = await db.query(
      `SELECT COUNT(DISTINCT test_id) as count
       FROM user_exam_tests
       WHERE CAST(user_id AS TEXT) = ?
         AND CAST(COALESCE(is_completed, '0') AS INTEGER) = 1`,
      [APP_USER_ID],
    );
    const ticketsDone = Math.min(this.toInt(completedTicketsRes.values?.[0]?.count, 0), ticketsTotal);

    const readiness = totalQuestions > 0
      ? Math.round((correct / totalQuestions) * 100)
      : 0;

    return {
      answered,
      total: totalQuestions,
      errors,
      readiness,
      ticketsDone,
      ticketsTotal,
    };
  }

  async getWrongQuestions(langId: number): Promise<WrongQuestionItem[]> {
    const latestAnswers = await this.getLatestUserAnswersMap();
    const wrongRows = [...latestAnswers.values()].filter((row) => !this.toBool(row.is_right));
    if (wrongRows.length === 0) return [];

    const wrongIds = wrongRows.map((row) => this.toInt(row.question_id, 0)).filter(Boolean);
    const questions = await this.loadQuestionsByIds(wrongIds, langId);
    const byId = new Map<number, QuestionItem>();
    for (const q of questions) byId.set(q.id, q);

    const result: WrongQuestionItem[] = [];
    for (const row of wrongRows) {
      const qId = this.toInt(row.question_id, 0);
      const question = byId.get(qId);
      if (!question) continue;

      result.push({
        ...question,
        selected_answer_id: row.answer_id ? this.toInt(row.answer_id, 0) : null,
      });
    }

    return result;
  }

  async getExamTests(langId: number): Promise<ExamTestItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('test_translations', langId);

    const res = await db.query(
      `WITH latest_completed_sessions AS (
          SELECT
            CAST(test_id AS INTEGER) as test_id,
            MAX(CAST(id AS INTEGER)) as user_exam_test_id
          FROM user_exam_tests
          WHERE CAST(user_id AS TEXT) = ?
            AND CAST(COALESCE(is_completed, '0') AS INTEGER) = 1
          GROUP BY CAST(test_id AS INTEGER)
        ),
        latest_completed_scores AS (
          SELECT
            lcs.test_id as test_id,
            CAST(COALESCE(uet.correct_answers, '0') AS INTEGER) as solved_count
          FROM latest_completed_sessions lcs
          JOIN user_exam_tests uet
            ON CAST(uet.id AS INTEGER) = lcs.user_exam_test_id
        )
       SELECT
          CAST(t.id AS INTEGER) as id,
          tt.title as title,
          CAST(COALESCE(t.duration, 0) AS INTEGER) as duration,
          CAST(COALESCE(t.max_wrong_answers, 0) AS INTEGER) as max_wrong_answers,
          CAST(COALESCE(lcs.solved_count, 0) AS INTEGER) as solved_count,
          (
            SELECT COUNT(*)
            FROM test_questions tq
            WHERE CAST(tq.test_id AS TEXT) = CAST(t.id AS TEXT)
          ) as question_count
       FROM tests t
       LEFT JOIN test_translations tt
         ON CAST(tt.test_id AS TEXT) = CAST(t.id AS TEXT)
        AND CAST(tt.language_id AS TEXT) = ?
       LEFT JOIN latest_completed_scores lcs
         ON CAST(lcs.test_id AS TEXT) = CAST(t.id AS TEXT)
       WHERE t.deleted_at IS NULL OR CAST(t.deleted_at AS TEXT) = ''
       ORDER BY CAST(t.id AS INTEGER)`,
      [APP_USER_ID, resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => {
      const id = this.toInt(row.id, 0);
      return {
        id,
        title: String(row.title ?? `Թեստ ${id}`),
        question_count: this.toInt(row.question_count, 0),
        solved_count: this.toInt(row.solved_count, 0),
        duration: this.toInt(row.duration, 0),
        max_wrong_answers: this.toInt(row.max_wrong_answers, 0),
      };
    });
  }

  async getTheoryTopics(langId: number): Promise<TheoryTopicItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('group_translations', langId);

    const res = await db.query(
      `WITH latest_user_answers AS (
         SELECT
           CAST(question_id AS TEXT) as question_id,
           MAX(CAST(id AS INTEGER)) as max_id
         FROM user_statistics
         WHERE CAST(user_id AS TEXT) = ?
         GROUP BY CAST(question_id AS TEXT)
       ),
       answered_by_group AS (
         SELECT
           CAST(q.group_id AS INTEGER) as group_id,
           COUNT(*) as solved_count
         FROM questions q
         JOIN latest_user_answers lua
           ON CAST(q.id AS TEXT) = lua.question_id
         GROUP BY CAST(q.group_id AS INTEGER)
       )
       SELECT
          CAST(gt.group_id AS INTEGER) as id,
          gt.title as title,
          gt.description as description,
          (
            SELECT COUNT(*)
            FROM questions q
            WHERE CAST(q.group_id AS TEXT) = CAST(gt.group_id AS TEXT)
          ) as question_count,
          CAST(COALESCE(abg.solved_count, 0) AS INTEGER) as solved_count
       FROM group_translations gt
       LEFT JOIN answered_by_group abg
         ON CAST(abg.group_id AS TEXT) = CAST(gt.group_id AS TEXT)
       WHERE CAST(gt.language_id AS TEXT) = ?
       ORDER BY CAST(gt.group_id AS INTEGER)`,
      [APP_USER_ID, resolvedLangId],
    );

    return (res.values ?? [])
      .map((row: DbRow) => ({
        id: this.toInt(row.id, 0),
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        question_count: this.toInt(row.question_count, 0),
        solved_count: this.toInt(row.solved_count, 0),
      }))
      .filter((row) => row.id > 0);
  }

  async getSmartTrainingTopics(langId: number): Promise<SmartTheoryTopicItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('group_translations', langId);

    const res = await db.query(
      `WITH latest_user_answers AS (
         SELECT
           CAST(question_id AS TEXT) as question_id,
           MAX(CAST(id AS INTEGER)) as max_id
         FROM user_statistics
         WHERE CAST(user_id AS TEXT) = ?
         GROUP BY CAST(question_id AS TEXT)
       ),
       latest_answers AS (
         SELECT
           CAST(us.question_id AS TEXT) as question_id,
           CAST(COALESCE(us.is_right, '0') AS INTEGER) as is_right
         FROM user_statistics us
         JOIN latest_user_answers lua
           ON CAST(us.id AS INTEGER) = lua.max_id
       )
       SELECT
          CAST(gt.group_id AS INTEGER) as id,
          gt.title as title,
          gt.description as description,
          COUNT(DISTINCT CAST(q.id AS TEXT)) as question_count,
          COUNT(DISTINCT la.question_id) as answered_count,
          SUM(CASE WHEN la.question_id IS NOT NULL AND CAST(COALESCE(la.is_right, 0) AS INTEGER) = 1 THEN 1 ELSE 0 END) as correct_count,
          SUM(CASE WHEN la.question_id IS NOT NULL AND CAST(COALESCE(la.is_right, 0) AS INTEGER) = 0 THEN 1 ELSE 0 END) as wrong_count
       FROM group_translations gt
       LEFT JOIN questions q
         ON CAST(q.group_id AS TEXT) = CAST(gt.group_id AS TEXT)
       LEFT JOIN latest_answers la
         ON CAST(la.question_id AS TEXT) = CAST(q.id AS TEXT)
       WHERE CAST(gt.language_id AS TEXT) = ?
       GROUP BY CAST(gt.group_id AS INTEGER), gt.title, gt.description
       ORDER BY CAST(gt.group_id AS INTEGER)`,
      [APP_USER_ID, resolvedLangId],
    );

    return (res.values ?? [])
      .map((row: DbRow) => {
        const questionCount = this.toInt(row.question_count, 0);
        const answeredCount = this.toInt(row.answered_count, 0);
        const correctCount = this.toInt(row.correct_count, 0);
        const wrongCount = this.toInt(row.wrong_count, 0);
        const accuracy = answeredCount > 0
          ? Math.round((correctCount / answeredCount) * 100)
          : 0;
        const recommendationReason: SmartTheoryTopicItem['recommendation_reason'] =
          wrongCount > 0 ? 'weak' : 'incomplete';

        return {
          id: this.toInt(row.id, 0),
          title: String(row.title ?? ''),
          description: String(row.description ?? ''),
          question_count: questionCount,
          solved_count: answeredCount,
          answered_count: answeredCount,
          correct_count: correctCount,
          wrong_count: wrongCount,
          accuracy,
          recommendation_reason: recommendationReason,
        };
      })
      .filter((row) =>
        row.id > 0
        && row.question_count > 0
        && row.answered_count > 0
        && (row.wrong_count > 0 || row.answered_count < row.question_count),
      )
      .sort((a, b) => {
        const reasonWeight = (value: SmartTheoryTopicItem['recommendation_reason']) =>
          value === 'weak' ? 0 : 1;

        return (
          reasonWeight(a.recommendation_reason) - reasonWeight(b.recommendation_reason)
          || b.wrong_count - a.wrong_count
          || a.accuracy - b.accuracy
          || (a.answered_count / a.question_count) - (b.answered_count / b.question_count)
          || b.question_count - a.question_count
          || a.id - b.id
        );
      });
  }

  async getQuestionsByTest(testId: number, langId: number): Promise<QuestionItem[]> {
    const db = await this.ensureDb();
    const links = await db.query(
      `SELECT CAST(question_id AS INTEGER) as question_id
       FROM test_questions
       WHERE CAST(test_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER)`,
      [String(testId)],
    );

    let questionIds = (links.values ?? []).map((row: DbRow) => this.toInt(row.question_id, 0)).filter(Boolean);

    if (questionIds.length === 0) {
      const allRes = await db.query('SELECT CAST(id AS INTEGER) as id FROM questions ORDER BY CAST(id AS INTEGER)');
      const allIds = (allRes.values ?? []).map((row: DbRow) => this.toInt(row.id, 0)).filter(Boolean);
      if (allIds.length === 0) return [];

      const limit = Math.min(DEFAULT_EXAM_QUESTION_LIMIT, allIds.length);
      const start = ((Math.max(testId, 1) - 1) * limit) % allIds.length;
      questionIds = Array.from({ length: limit }, (_, index) => allIds[(start + index) % allIds.length]);
    }

    return this.loadQuestionsByIds(questionIds, langId);
  }

  async getRandomExamTestId(): Promise<number | null> {
    const db = await this.ensureDb();
    const random = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM tests
       WHERE deleted_at IS NULL OR CAST(deleted_at AS TEXT) = ''
       ORDER BY RANDOM()
       LIMIT 1`,
    );

    const id = this.toInt(random.values?.[0]?.id, 0);
    return id > 0 ? id : null;
  }

  async getRandomExamQuestions(langId: number): Promise<QuestionItem[]> {
    const randomTestId = await this.getRandomExamTestId();
    if (!randomTestId) {
      return [];
    }
    return this.getQuestionsByTest(randomTestId, langId);
  }

  async getQuestionsByGroup(groupId: number, langId: number): Promise<QuestionItem[]> {
    const db = await this.ensureDb();

    const res = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM questions
       WHERE CAST(group_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER)`,
      [String(groupId)],
    );

    const questionIds = (res.values ?? []).map((row: DbRow) => this.toInt(row.id, 0)).filter(Boolean);
    return this.loadQuestionsByIds(questionIds, langId);
  }

  async getFavoriteQuestions(langId: number): Promise<FavoriteQuestionItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('question_translations', langId);

    const ownFavRes = await db.query(
      `SELECT CAST(question_id AS INTEGER) as question_id
       FROM favorite_questions
       WHERE CAST(user_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER) DESC`,
      [APP_USER_ID],
    );

    let questionIds = (ownFavRes.values ?? []).map((row: DbRow) => this.toInt(row.question_id, 0)).filter(Boolean);

    if (questionIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(questionIds));
    const placeholders = uniqueIds.map(() => '?').join(', ');

    const questionsRes = await db.query(
      `SELECT
          CAST(q.id AS INTEGER) as id,
          q.image as image,
          qt.title as title
       FROM questions q
       LEFT JOIN question_translations qt
         ON CAST(q.id AS TEXT) = CAST(qt.question_id AS TEXT)
        AND CAST(qt.language_id AS TEXT) = ?
       WHERE CAST(q.id AS TEXT) IN (${placeholders})`,
      [resolvedLangId, ...uniqueIds.map(String)],
    );

    const mapById = new Map<number, DbRow>();
    for (const row of questionsRes.values ?? []) {
      mapById.set(this.toInt(row.id, 0), row);
    }

    return uniqueIds
      .map((id) => {
        const row = mapById.get(id);
        if (!row) return null;
        return {
          id,
          title: String(row.title ?? ''),
          image: row.image ? String(row.image) : null,
        } as FavoriteQuestionItem;
      })
      .filter((item): item is FavoriteQuestionItem => Boolean(item));
  }

  async getQuestionsByIds(questionIds: number[], langId: number): Promise<QuestionItem[]> {
    const uniqueIds = Array.from(
      new Set(
        questionIds
          .map((id) => this.toInt(id, 0))
          .filter((id) => id > 0),
      ),
    );

    if (uniqueIds.length === 0) {
      return [];
    }

    return this.loadQuestionsByIds(uniqueIds, langId);
  }

  async getFavoriteQuestionIds(questionIds: number[]): Promise<number[]> {
    if (!questionIds.length) {
      return [];
    }

    const db = await this.ensureDb();
    const placeholders = questionIds.map(() => '?').join(', ');
    const rows = await db.query(
      `SELECT DISTINCT CAST(question_id AS INTEGER) as question_id
       FROM favorite_questions
       WHERE CAST(user_id AS TEXT) = ?
         AND CAST(question_id AS TEXT) IN (${placeholders})`,
      [APP_USER_ID, ...questionIds.map(String)],
    );

    return (rows.values ?? [])
      .map((row: DbRow) => this.toInt(row.question_id, 0))
      .filter(Boolean);
  }

  async toggleFavoriteQuestion(questionId: number): Promise<boolean> {
    const db = await this.ensureDb();
    const exists = await db.query(
      `SELECT CAST(id AS INTEGER) as id
       FROM favorite_questions
       WHERE CAST(user_id AS TEXT) = ?
         AND CAST(question_id AS TEXT) = ?
       ORDER BY CAST(id AS INTEGER) DESC
       LIMIT 1`,
      [APP_USER_ID, String(questionId)],
    );

    const existingId = this.toInt(exists.values?.[0]?.id, 0);

    if (existingId > 0) {
      await db.run(`DELETE FROM favorite_questions WHERE CAST(id AS INTEGER) = ?`, [String(existingId)]);
      return false;
    }

    const nextId = await this.getNextTableId('favorite_questions');
    await db.run(
      `INSERT INTO favorite_questions (id, user_id, question_id)
       VALUES (?, ?, ?)`,
      [String(nextId), APP_USER_ID, String(questionId)],
    );

    return true;
  }

  async getTests(langId: number): Promise<ExamTestItem[]> {
    return this.getExamTests(langId);
  }

  async getRules(langId: number) {
    const db = await this.ensureDb();
    await this.ensureExploitationTablesAndSeed(db);
    const resolvedLangId = await this.resolveLanguageIdForTable('exploitation_translations', langId);
    const query = `SELECT id, content FROM exploitation_translations WHERE CAST(language_id AS TEXT) = ?`;
    const res = await db.query(query, [resolvedLangId]);
    return res.values || [];
  }

  async getPddChapters(langId: number): Promise<RuleChapterItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('pdd_chapter_translations', langId);
    const chapterFk = await this.resolveColumnName('pdd_chapter_translations', ['chapter_id', 'pdd_chapter_id'], 'chapter_id');

    const res = await db.query(
      `SELECT
          CAST(c.id AS INTEGER) as id,
          ct.title as title,
          CAST(COALESCE(rc.rules_count, 0) AS INTEGER) as items_count
       FROM pdd_chapters c
       LEFT JOIN pdd_chapter_translations ct
         ON CAST(ct.${chapterFk} AS TEXT) = CAST(c.id AS TEXT)
        AND CAST(ct.language_id AS TEXT) = ?
       LEFT JOIN (
         SELECT CAST(chapter_id AS INTEGER) as chapter_id, COUNT(*) as rules_count
         FROM pdd_rules
         GROUP BY CAST(chapter_id AS INTEGER)
       ) rc
         ON CAST(rc.chapter_id AS TEXT) = CAST(c.id AS TEXT)
       ORDER BY CAST(c.id AS INTEGER)`,
      [resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      title: String(row.title ?? ''),
      items_count: this.toInt(row.items_count, 0),
    })).filter((row) => row.id > 0);
  }

  async getPddRulesByChapter(chapterId: number, langId: number): Promise<RuleContentItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('pdd_rule_translations', langId);
    const ruleFk = await this.resolveColumnName('pdd_rule_translations', ['rule_id', 'pdd_rule_id'], 'rule_id');

    const res = await db.query(
      `SELECT
          CAST(r.id AS INTEGER) as id,
          r.rule_number as rule_number,
          rt.content as content
       FROM pdd_rules r
       LEFT JOIN pdd_rule_translations rt
         ON CAST(rt.${ruleFk} AS TEXT) = CAST(r.id AS TEXT)
        AND CAST(rt.language_id AS TEXT) = ?
       WHERE CAST(r.chapter_id AS TEXT) = ?
       ORDER BY CAST(r.id AS INTEGER)`,
      [resolvedLangId, String(chapterId)],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      number: String(row.rule_number ?? '').trim(),
      content: String(row.content ?? ''),
    })).filter((row) => row.id > 0);
  }

  async getExploitationChapters(langId: number): Promise<RuleChapterItem[]> {
    const db = await this.ensureDb();
    await this.ensureExploitationTablesAndSeed(db);
    const resolvedLangId = await this.resolveLanguageIdForTable('exploitation_chapter_translations', langId);
    const chapterFk = await this.resolveColumnName(
      'exploitation_chapter_translations',
      ['chapter_id', 'exploitation_chapter_id'],
      'chapter_id',
    );

    const res = await db.query(
      `SELECT
          CAST(c.id AS INTEGER) as id,
          ct.title as title,
          CAST(COALESCE(ec.items_count, 0) AS INTEGER) as items_count
       FROM exploitation_chapters c
       LEFT JOIN exploitation_chapter_translations ct
         ON CAST(ct.${chapterFk} AS TEXT) = CAST(c.id AS TEXT)
        AND CAST(ct.language_id AS TEXT) = ?
       LEFT JOIN (
         SELECT CAST(chapter_id AS INTEGER) as chapter_id, COUNT(*) as items_count
         FROM exploitations
         GROUP BY CAST(chapter_id AS INTEGER)
       ) ec
         ON CAST(ec.chapter_id AS TEXT) = CAST(c.id AS TEXT)
       ORDER BY CAST(c.id AS INTEGER)`,
      [resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      title: String(row.title ?? ''),
      items_count: this.toInt(row.items_count, 0),
    })).filter((row) => row.id > 0);
  }

  async getExploitationsByChapter(chapterId: number, langId: number): Promise<RuleContentItem[]> {
    const db = await this.ensureDb();
    await this.ensureExploitationTablesAndSeed(db);
    const resolvedLangId = await this.resolveLanguageIdForTable('exploitation_translations', langId);
    const exploitationFk = await this.resolveColumnName(
      'exploitation_translations',
      ['exploitation_id', 'exploitation_rule_id'],
      'exploitation_id',
    );

    const res = await db.query(
      `SELECT
          CAST(e.id AS INTEGER) as id,
          et.content as content
       FROM exploitations e
       LEFT JOIN exploitation_translations et
         ON CAST(et.${exploitationFk} AS TEXT) = CAST(e.id AS TEXT)
        AND CAST(et.language_id AS TEXT) = ?
       WHERE CAST(e.chapter_id AS TEXT) = ?
       ORDER BY CAST(e.id AS INTEGER)`,
      [resolvedLangId, String(chapterId)],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      number: '',
      content: String(row.content ?? ''),
    })).filter((row) => row.id > 0);
  }

  async getRoadMarkingChapters(langId: number): Promise<RuleChapterItem[]> {
    const db = await this.ensureDb();
    await this.ensureRoadMarkingsTablesAndSeed(db);

    const resolvedLangId = await this.resolveLanguageIdForTable('road_marking_chapters', langId);

    const res = await db.query(
      `SELECT
          CAST(c.id AS INTEGER) as id,
          c.title as title,
          CAST(COALESCE(i.items_count, 0) AS INTEGER) as items_count
       FROM road_marking_chapters c
       LEFT JOIN (
         SELECT CAST(chapter_id AS INTEGER) as chapter_id, COUNT(*) as items_count
         FROM road_marking_items
         WHERE CAST(language_id AS TEXT) = ?
         GROUP BY CAST(chapter_id AS INTEGER)
       ) i
         ON CAST(i.chapter_id AS TEXT) = CAST(c.id AS TEXT)
       WHERE CAST(c.language_id AS TEXT) = ?
       ORDER BY CAST(c.sort_order AS INTEGER), CAST(c.id AS INTEGER)`,
      [resolvedLangId, resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      title: String(row.title ?? ''),
      items_count: this.toInt(row.items_count, 0),
    })).filter((row) => row.id > 0);
  }

  async getRoadMarkingsByChapter(chapterId: number, langId: number): Promise<RuleContentItem[]> {
    const db = await this.ensureDb();
    await this.ensureRoadMarkingsTablesAndSeed(db);

    const resolvedLangId = await this.resolveLanguageIdForTable('road_marking_items', langId);

    const res = await db.query(
      `SELECT
          CAST(id AS INTEGER) as id,
          code,
          content_html as content,
          image_name
       FROM road_marking_items
       WHERE CAST(chapter_id AS TEXT) = ?
         AND CAST(language_id AS TEXT) = ?
       ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
      [String(chapterId), resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      number: String(row.code ?? '').trim(),
      content: String(row.content ?? ''),
      image: row.image_name ? String(row.image_name) : null,
    })).filter((row) => row.id > 0);
  }

  async getRoadSafetyLawChapters(langId: number): Promise<RuleChapterItem[]> {
    const db = await this.ensureDb();
    await this.ensureRoadSafetyLawTablesAndSeed(db);

    const resolvedLangId = await this.resolveLanguageIdForTable('road_safety_law_chapters', langId);

    const res = await db.query(
      `SELECT
          CAST(c.id AS INTEGER) as id,
          c.title as title,
          CAST(COALESCE(a.items_count, 0) AS INTEGER) as items_count
       FROM road_safety_law_chapters c
       LEFT JOIN (
         SELECT CAST(chapter_id AS INTEGER) as chapter_id, COUNT(*) as items_count
         FROM road_safety_law_articles
         WHERE CAST(language_id AS TEXT) = ?
         GROUP BY CAST(chapter_id AS INTEGER)
       ) a
         ON CAST(a.chapter_id AS TEXT) = CAST(c.id AS TEXT)
       WHERE CAST(c.language_id AS TEXT) = ?
       ORDER BY CAST(c.sort_order AS INTEGER), CAST(c.id AS INTEGER)`,
      [resolvedLangId, resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      title: String(row.title ?? ''),
      items_count: this.toInt(row.items_count, 0),
    })).filter((row) => row.id > 0);
  }

  async getRoadSafetyLawArticlesByChapter(chapterId: number, langId: number): Promise<RuleContentItem[]> {
    const db = await this.ensureDb();
    await this.ensureRoadSafetyLawTablesAndSeed(db);

    const resolvedLangId = await this.resolveLanguageIdForTable('road_safety_law_articles', langId);

    const res = await db.query(
      `SELECT
          CAST(id AS INTEGER) as id,
          content_html as content
       FROM road_safety_law_articles
       WHERE CAST(chapter_id AS TEXT) = ?
         AND CAST(language_id AS TEXT) = ?
       ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
      [String(chapterId), resolvedLangId],
    );

    return (res.values ?? []).map((row: DbRow) => ({
      id: this.toInt(row.id, 0),
      number: '',
      content: String(row.content ?? ''),
    })).filter((row) => row.id > 0);
  }

  async getSignCategories(langId: number) {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('road_sign_category_translations', langId);

    const categoryFk = (await this.tableHasColumn('road_sign_category_translations', 'road_sign_category_id'))
      ? 'road_sign_category_id'
      : 'category_id';

    const query = `
      SELECT CAST(${categoryFk} AS INTEGER) as id, title
      FROM road_sign_category_translations
      WHERE CAST(language_id AS TEXT) = ?
      ORDER BY CAST(${categoryFk} AS INTEGER)
    `;

    const res = await db.query(query, [resolvedLangId]);
    return res.values || [];
  }

  async getSignsByCategory(categoryId: number, langId: number) {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('road_sign_translations', langId);

    const signFk = (await this.tableHasColumn('road_sign_translations', 'road_sign_id'))
      ? 'road_sign_id'
      : 'sign_id';
    const hasCodeColumn = await this.tableHasColumn('road_sign_translations', 'code');
    const codeSelect = hasCodeColumn ? 'st.code' : 'NULL';

    const query = `
      SELECT s.id, s.image, ${codeSelect} as code, st.title, st.description
      FROM road_signs s
      JOIN road_sign_translations st ON CAST(s.id AS TEXT) = CAST(st.${signFk} AS TEXT)
      WHERE CAST(s.category_id AS TEXT) = ? AND CAST(st.language_id AS TEXT) = ?
      ORDER BY CAST(s.id AS INTEGER)
    `;
    const res = await db.query(query, [String(categoryId), resolvedLangId]);
    return res.values || [];
  }

  async getRoadSignReferences(langId: number): Promise<SignReferenceItem[]> {
    const db = await this.ensureDb();
    const resolvedLangId = await this.resolveLanguageIdForTable('road_sign_translations', langId);

    const signFk = (await this.tableHasColumn('road_sign_translations', 'road_sign_id'))
      ? 'road_sign_id'
      : 'sign_id';
    const hasCodeColumn = await this.tableHasColumn('road_sign_translations', 'code');
    const codeSelect = hasCodeColumn ? 'st.code' : 'NULL';

    const res = await db.query(
      `SELECT
          CAST(s.id AS INTEGER) as id,
          s.image as image,
          ${codeSelect} as code,
          st.title as title,
          st.description as description
       FROM road_signs s
       JOIN road_sign_translations st
         ON CAST(s.id AS TEXT) = CAST(st.${signFk} AS TEXT)
       WHERE CAST(st.language_id AS TEXT) = ?
       ORDER BY CAST(s.id AS INTEGER)`,
      [resolvedLangId],
    );

    return (res.values ?? [])
      .map((row: DbRow) => ({
        id: this.toInt(row.id, 0),
        code: resolveRoadSignCode(row.code, row.title),
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        image: row.image ? String(row.image) : null,
      }))
      .filter((item) => item.id > 0 && item.code);
  }

  async getRoadMarkingReferences(langId: number): Promise<RoadMarkingReferenceItem[]> {
    const db = await this.ensureDb();
    await this.ensureRoadMarkingsTablesAndSeed(db);
    const resolvedLangId = await this.resolveLanguageIdForTable('road_marking_items', langId);

    const res = await db.query(
      `SELECT
          CAST(id AS INTEGER) as id,
          code,
          content_html as content,
          image_name
       FROM road_marking_items
       WHERE CAST(language_id AS TEXT) = ?
       ORDER BY CAST(sort_order AS INTEGER), CAST(id AS INTEGER)`,
      [resolvedLangId],
    );

    return (res.values ?? [])
      .map((row: DbRow) => ({
        id: this.toInt(row.id, 0),
        code: String(row.code ?? '').trim(),
        content: String(row.content ?? ''),
        image: row.image_name ? String(row.image_name) : null,
      }))
      .filter((item) => item.id > 0 && item.code);
  }
}

export const dbService = new DatabaseService();
