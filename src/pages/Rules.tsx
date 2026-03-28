import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  bookOutline,
  buildOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  gridOutline,
  imageOutline,
} from 'ionicons/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dbService,
  RoadMarkingReferenceItem,
  RuleChapterItem,
  RuleContentItem,
  SignReferenceItem,
} from '../services/DatabaseService';
import { useLanguage } from '../context/LanguageContext';
import ruleC1Image from '../assets/images/c1.png';
import ruleC2Image from '../assets/images/c2.png';
import ruleC3Image from '../assets/images/c3.png';
import './Rules.css';

type RulesSectionType = 'pdd' | 'law' | 'exploitation' | 'markings';
type RulesView = 'sections' | 'chapters' | 'items';
type ReferenceKind = 'sign' | 'marking';

type IndexedSignReference = SignReferenceItem & { imageSrc: string | null };
type IndexedMarkingReference = RoadMarkingReferenceItem & { imageSrc: string | null };

type RuleReferencePreview = {
  kind: ReferenceKind;
  code: string;
  title: string;
  description: string;
  htmlContent: string | null;
  imageSrc: string | null;
};

const SECOND_PDD_CHAPTER_IMAGE_BY_NUMBER: Record<number, string> = {
  14: ruleC1Image,
  15: ruleC2Image,
  16: ruleC3Image,
};

const ROAD_MARKING_IMAGE_MODULES = import.meta.glob('../assets/images/road-markings/*', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const ROAD_SIGN_IMAGE_MODULES = import.meta.glob('../assets/images/road-signs/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const ROAD_MARKING_IMAGE_BY_FILENAME: Record<string, string> = Object.entries(ROAD_MARKING_IMAGE_MODULES).reduce(
  (acc, [modulePath, resolvedPath]) => {
    const fileName = modulePath.split('/').pop();
    if (fileName) {
      acc[fileName] = resolvedPath;
    }
    return acc;
  },
  {} as Record<string, string>,
);

const ROAD_SIGN_IMAGE_BY_FILENAME: Record<string, string> = Object.entries(ROAD_SIGN_IMAGE_MODULES).reduce(
  (acc, [modulePath, resolvedPath]) => {
    const fileName = modulePath.split('/').pop();
    if (fileName) {
      acc[fileName] = resolvedPath;
    }
    return acc;
  },
  {} as Record<string, string>,
);

const FALLBACK_SIGN_REFERENCES: SignReferenceItem[] = [
  {
    id: -135,
    code: '1.35',
    title: '«Խաչմերուկի տարածք»',
    description:
      'Նշանակում է մոտեցում խաչմերուկին, որի հատվածը նշված է 1.26 գծանշմամբ, և որտեղ արգելվում է մուտք գործել, եթե առջևում՝ երթևեկության ուղղությամբ առաջացել է խցանում, որը վարորդին կհարկադրի կանգ առնել խոչընդոտ ստեղծելով հատող ճանապարհով լայնական ուղղությամբ տրանսպորտային միջոցների երթևեկության համար, բացառությամբ սույն Կանոններով սահմանված՝ աջ կամ ձախ շրջադարձ կատարելու դեպքերի։ 1.35 նշանը տեղադրվում է խաչմերուկի սահմանին, իսկ բարդ խաչմերուկներում՝ խաչմերուկի սահմանից ոչ ավել, քան 30 մ հեռավորության վրա։',
    image: null,
  },
];

const normalizeRoadCode = (value: string): string => String(value ?? '').trim().replace(/\s+/g, '');

const extractRoadCodes = (value: string): string[] => {
  const matches = String(value ?? '').match(/\d+\.\d+(?:\.\d+)?/g) ?? [];
  return Array.from(new Set(matches.map((match) => normalizeRoadCode(match)).filter(Boolean)));
};

const resolveSignImage = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const filename = String(value).trim().split('/').pop()?.trim();
  if (!filename) return null;
  return ROAD_SIGN_IMAGE_BY_FILENAME[filename] ?? null;
};

const Rules: React.FC = () => {
  const [view, setView] = useState<RulesView>('sections');
  const [selectedSection, setSelectedSection] = useState<RulesSectionType | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<RuleChapterItem | null>(null);
  const [chapters, setChapters] = useState<RuleChapterItem[]>([]);
  const [items, setItems] = useState<RuleContentItem[]>([]);
  const [signReferencesByCode, setSignReferencesByCode] = useState<Record<string, IndexedSignReference>>({});
  const [markingReferencesByCode, setMarkingReferencesByCode] = useState<Record<string, IndexedMarkingReference>>({});
  const [referencePreview, setReferencePreview] = useState<RuleReferencePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const { langId, t } = useLanguage();
  const requestRef = useRef(0);
  const referenceRequestRef = useRef(0);

  const sections = useMemo(
    () => [
      {
        type: 'pdd' as RulesSectionType,
        title: t('road_rules'),
        subtitle: t('road_rules_hint'),
        icon: bookOutline,
      },
      {
        type: 'law' as RulesSectionType,
        title: t('road_safety_law'),
        subtitle: t('road_safety_law_hint'),
        icon: documentTextOutline,
      },
      {
        type: 'exploitation' as RulesSectionType,
        title: t('exploitation_rules'),
        subtitle: t('exploitation_rules_hint'),
        icon: buildOutline,
      },
      {
        type: 'markings' as RulesSectionType,
        title: t('road_markings'),
        subtitle: t('road_markings_hint'),
        icon: gridOutline,
      },
    ],
    [t],
  );

  const activeSection = useMemo(
    () => sections.find((section) => section.type === selectedSection) ?? null,
    [sections, selectedSection],
  );

  const pageTitle = useMemo(() => {
    if (view === 'sections') return t('rules');
    if (view === 'chapters') return activeSection?.title || t('rules');
    return selectedChapter?.title || activeSection?.title || t('rules');
  }, [activeSection?.title, selectedChapter?.title, t, view]);

  const resetToSections = () => {
    requestRef.current += 1;
    setView('sections');
    setSelectedSection(null);
    setSelectedChapter(null);
    setChapters([]);
    setItems([]);
    setReferencePreview(null);
    setLoading(false);
  };

  const loadChapters = async (sectionType: RulesSectionType) => {
    const requestId = ++requestRef.current;
    setLoading(true);

    try {
      const data = sectionType === 'pdd'
        ? await dbService.getPddChapters(langId)
        : sectionType === 'law'
          ? await dbService.getRoadSafetyLawChapters(langId)
          : sectionType === 'exploitation'
            ? await dbService.getExploitationChapters(langId)
            : await dbService.getRoadMarkingChapters(langId);

      if (requestRef.current !== requestId) return;
      setChapters(data);
    } catch (error) {
      console.error('Failed to load rule chapters', error);
      if (requestRef.current !== requestId) return;
      setChapters([]);
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const loadItems = async (sectionType: RulesSectionType, chapterId: number) => {
    const requestId = ++requestRef.current;
    setLoading(true);

    try {
      const data = sectionType === 'pdd'
        ? await dbService.getPddRulesByChapter(chapterId, langId)
        : sectionType === 'law'
          ? await dbService.getRoadSafetyLawArticlesByChapter(chapterId, langId)
          : sectionType === 'exploitation'
            ? await dbService.getExploitationsByChapter(chapterId, langId)
            : await dbService.getRoadMarkingsByChapter(chapterId, langId);

      if (requestRef.current !== requestId) return;
      setItems(data);
    } catch (error) {
      console.error('Failed to load chapter rules', error);
      if (requestRef.current !== requestId) return;
      setItems([]);
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const requestId = ++referenceRequestRef.current;

    const loadReferenceIndexes = async () => {
      try {
        const [signReferences, markingReferences] = await Promise.all([
          dbService.getRoadSignReferences(langId),
          dbService.getRoadMarkingReferences(langId),
        ]);

        if (cancelled || referenceRequestRef.current !== requestId) return;

        const nextSignMap: Record<string, IndexedSignReference> = {};
        for (const reference of signReferences) {
          const indexed: IndexedSignReference = {
            ...reference,
            imageSrc: resolveSignImage(reference.image),
          };

          const aliases = new Set<string>([
            normalizeRoadCode(reference.code),
            ...extractRoadCodes(reference.code),
            ...extractRoadCodes(reference.title),
          ]);

          for (const alias of aliases) {
            if (!alias) continue;
            nextSignMap[alias] = indexed;
          }
        }

        for (const fallbackReference of FALLBACK_SIGN_REFERENCES) {
          const fallbackCode = normalizeRoadCode(fallbackReference.code);
          if (!fallbackCode || nextSignMap[fallbackCode]) continue;

          nextSignMap[fallbackCode] = {
            ...fallbackReference,
            code: fallbackCode,
            imageSrc: null,
          };
        }

        const nextMarkingMap: Record<string, IndexedMarkingReference> = {};
        for (const reference of markingReferences) {
          const indexed: IndexedMarkingReference = {
            ...reference,
            imageSrc: reference.image
              ? ROAD_MARKING_IMAGE_BY_FILENAME[String(reference.image).trim()] ?? null
              : null,
          };

          const aliases = new Set<string>([
            normalizeRoadCode(reference.code),
            ...extractRoadCodes(reference.code),
          ]);

          for (const alias of aliases) {
            if (!alias) continue;
            nextMarkingMap[alias] = indexed;
          }
        }

        setSignReferencesByCode(nextSignMap);
        setMarkingReferencesByCode(nextMarkingMap);
      } catch (error) {
        console.error('Failed to load rule references', error);
        if (cancelled || referenceRequestRef.current !== requestId) return;
        setSignReferencesByCode({});
        setMarkingReferencesByCode({});
      }
    };

    void loadReferenceIndexes();

    return () => {
      cancelled = true;
    };
  }, [langId]);

  const resolveReferenceKind = useCallback(
    (
      code: string,
      localContextText: string,
      fullContextText: string,
      beforeText: string,
      afterText: string,
    ): ReferenceKind | null => {
      const normalizedCode = normalizeRoadCode(code);
      if (!normalizedCode) return null;

      const signRef = signReferencesByCode[normalizedCode];
      const markingRef = markingReferencesByCode[normalizedCode];
      if (!signRef && !markingRef) return null;
      if (signRef && !markingRef) return 'sign';
      if (!signRef && markingRef) return 'marking';

      const SIGN_KEYWORD_REGEX = /նշան|ցուցանակ/u;
      const MARKING_KEYWORD_REGEX = /գծանշ|գիծ|զեբր/u;

      const detectMentions = (source: string) => {
        const lowered = String(source ?? '').toLowerCase();
        return {
          mentionsMarking: MARKING_KEYWORD_REGEX.test(lowered),
          mentionsSign: SIGN_KEYWORD_REGEX.test(lowered),
        };
      };

      const pickNearestMention = (source: string): ReferenceKind | null => {
        const lowered = String(source ?? '').toLowerCase();
        const signIndex = lowered.search(SIGN_KEYWORD_REGEX);
        const markingIndex = lowered.search(MARKING_KEYWORD_REGEX);
        const hasSign = signIndex >= 0;
        const hasMarking = markingIndex >= 0;

        if (hasSign && !hasMarking) return 'sign';
        if (hasMarking && !hasSign) return 'marking';
        if (hasSign && hasMarking) return signIndex <= markingIndex ? 'sign' : 'marking';
        return null;
      };

      // Hard hint near the code token. Example: `1.35 ... նշանի հետ` should always resolve as sign.
      const loweredAfter = String(afterText ?? '').toLowerCase();
      const loweredBefore = String(beforeText ?? '').toLowerCase();
      const immediateAfterSign = SIGN_KEYWORD_REGEX.test(loweredAfter);
      const immediateAfterMarking = MARKING_KEYWORD_REGEX.test(loweredAfter);
      if (immediateAfterSign && !immediateAfterMarking) return 'sign';
      if (immediateAfterMarking && !immediateAfterSign) return 'marking';

      const immediateBeforeSign = SIGN_KEYWORD_REGEX.test(loweredBefore);
      const immediateBeforeMarking = MARKING_KEYWORD_REGEX.test(loweredBefore);
      if (immediateBeforeSign && !immediateBeforeMarking) return 'sign';
      if (immediateBeforeMarking && !immediateBeforeSign) return 'marking';

      const nearbyAfterChoice = pickNearestMention(afterText);
      if (nearbyAfterChoice) return nearbyAfterChoice;

      const nearbyBeforeChoice = pickNearestMention(beforeText);
      if (nearbyBeforeChoice) return nearbyBeforeChoice;

      const localMentions = detectMentions(localContextText);
      if (localMentions.mentionsSign && !localMentions.mentionsMarking) return 'sign';
      if (localMentions.mentionsMarking && !localMentions.mentionsSign) return 'marking';

      const fullMentions = detectMentions(fullContextText);
      if (fullMentions.mentionsSign && !fullMentions.mentionsMarking) return 'sign';
      if (fullMentions.mentionsMarking && !fullMentions.mentionsSign) return 'marking';

      return selectedSection === 'markings' ? 'marking' : 'sign';
    },
    [markingReferencesByCode, selectedSection, signReferencesByCode],
  );

  const linkifyRuleContent = useCallback((rawHtml: string, options?: { excludeCodes?: Set<string> }): string => {
    if (typeof document === 'undefined') return rawHtml;
    if (!rawHtml || !rawHtml.trim()) return rawHtml;

    const root = document.createElement('div');
    root.innerHTML = rawHtml;
    const excludeCodes = options?.excludeCodes ?? new Set<string>();

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
      const textNode = currentNode as Text;
      const parent = textNode.parentElement;
      if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE' && !parent.closest('a')) {
        textNodes.push(textNode);
      }
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue ?? '';
      if (!text.trim()) continue;

      const codeRegex = /\d+\.\d+(?:\.\d+)?/g;
      const fragment = document.createDocumentFragment();
      const contextText = textNode.parentElement?.textContent ?? text;
      let lastIndex = 0;
      let hasReplacement = false;
      let match = codeRegex.exec(text);

      while (match) {
        const token = match[0];
        const tokenStart = match.index;
        const tokenEnd = tokenStart + token.length;
        const normalizedToken = normalizeRoadCode(token);
        const localContext = text.slice(Math.max(0, tokenStart - 45), Math.min(text.length, tokenEnd + 45));
        const beforeText = text.slice(Math.max(0, tokenStart - 40), tokenStart);
        const afterText = text.slice(tokenEnd, Math.min(text.length, tokenEnd + 70));
        const referenceKind = excludeCodes.has(normalizedToken)
          ? null
          : resolveReferenceKind(token, localContext, contextText, beforeText, afterText);

        if (referenceKind) {
          if (tokenStart > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, tokenStart)));
          }

          const anchor = document.createElement('a');
          anchor.href = '#';
          anchor.className = `rules-ref-link rules-ref-link--${referenceKind}`;
          anchor.dataset.refCode = normalizedToken;
          anchor.dataset.refType = referenceKind;
          anchor.textContent = token;
          fragment.appendChild(anchor);
          lastIndex = tokenEnd;
          hasReplacement = true;
        }

        match = codeRegex.exec(text);
      }

      if (!hasReplacement) continue;

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    return root.innerHTML;
  }, [resolveReferenceKind]);

  const linkedItemHtmlById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const item of items) {
      map[item.id] = linkifyRuleContent(
        item.content,
        { excludeCodes: new Set(extractRoadCodes(String(item.number ?? ''))) },
      );
    }
    return map;
  }, [items, linkifyRuleContent]);

  const handleReferenceClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a.rules-ref-link') as HTMLAnchorElement | null;
    if (!link) return;

    event.preventDefault();

    const code = normalizeRoadCode(String(link.dataset.refCode ?? ''));
    const referenceKind = link.dataset.refType as ReferenceKind | undefined;
    if (!code || (referenceKind !== 'sign' && referenceKind !== 'marking')) return;

    if (referenceKind === 'sign') {
      const signReference = signReferencesByCode[code];
      if (!signReference) return;

      setReferencePreview({
        kind: 'sign',
        code: signReference.code,
        title: signReference.title,
        description: signReference.description || t('sign_description_empty'),
        htmlContent: null,
        imageSrc: signReference.imageSrc,
      });
      return;
    }

    const markingReference = markingReferencesByCode[code];
    if (!markingReference) return;

    setReferencePreview({
      kind: 'marking',
      code: markingReference.code,
      title: `${t('rule_marker')} ${markingReference.code}`,
      description: '',
      htmlContent: markingReference.content,
      imageSrc: markingReference.imageSrc,
    });
  }, [markingReferencesByCode, signReferencesByCode, t]);

  const openSection = async (sectionType: RulesSectionType) => {
    setView('chapters');
    setSelectedSection(sectionType);
    setSelectedChapter(null);
    setItems([]);
    await loadChapters(sectionType);
  };

  const openChapter = async (chapter: RuleChapterItem) => {
    if (!selectedSection) return;
    setView('items');
    setSelectedChapter(chapter);
    await loadItems(selectedSection, chapter.id);
  };

  const handleBack = () => {
    if (view === 'items') {
      requestRef.current += 1;
      setView('chapters');
      setSelectedChapter(null);
      setItems([]);
      setReferencePreview(null);
      setLoading(false);
      return;
    }

    resetToSections();
  };

  useIonViewWillEnter(() => {
    resetToSections();
  });

  useEffect(() => {
    if (view === 'chapters' && selectedSection) {
      void loadChapters(selectedSection);
      return;
    }

    if (view === 'items' && selectedSection && selectedChapter) {
      void loadItems(selectedSection, selectedChapter.id);
    }
  }, [langId]);

  return (
    <IonPage className="rules-page">
      <IonHeader translucent className="rules-header ion-no-border">
        <IonToolbar className="rules-toolbar">
          {view !== 'sections' && (
            <IonButtons slot="start">
              <IonButton fill="clear" className="rules-back-btn" onClick={handleBack}>
                <IonIcon icon={chevronBackOutline} className="rules-back-icon" />
                <span>{t('previous')}</span>
              </IonButton>
            </IonButtons>
          )}
          <IonTitle className="rules-title-sm">{pageTitle}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="rules-content">
        <IonHeader collapse="condense" className="rules-header-condense ion-no-border">
          <IonToolbar className="rules-toolbar-lg">
            <IonTitle size="large" className="rules-title-lg">
              {pageTitle}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="rules-wrap">
          {loading ? (
            <div className="rules-loader">
              <IonSpinner name="crescent" color="primary" />
            </div>
          ) : view === 'sections' ? (
            <div className="rules-sections-list">
              {sections.map((section) => (
                <button key={section.type} type="button" className="rules-section-card" onClick={() => openSection(section.type)}>
                  <div className="rules-section-icon-wrap">
                    <IonIcon icon={section.icon} className="rules-section-icon" />
                  </div>

                  <div className="rules-section-body">
                    <h3>{section.title}</h3>
                    <p>{section.subtitle}</p>
                  </div>

                  <IonIcon icon={chevronForwardOutline} className="rules-arrow-icon" />
                </button>
              ))}
            </div>
          ) : view === 'chapters' ? (
            chapters.length === 0 ? (
              <div className="rules-empty-card">
                <IonIcon icon={documentTextOutline} className="rules-empty-icon" />
                <h3>{t('no_chapters')}</h3>
              </div>
            ) : (
              <div className="rules-chapters-list">
                {chapters.map((chapter, index) => (
                  <button key={chapter.id} type="button" className="rules-chapter-row" onClick={() => openChapter(chapter)}>
                    <div className="rules-chapter-main">
                      <div className="rules-chapter-id">{index + 1}.</div>
                      <div className="rules-chapter-text">

                        <h3>{chapter.title}</h3>
                        <p>
                          {chapter.items_count} {t('rules_items')}
                        </p>
                      </div>
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="rules-arrow-icon" />
                  </button>
                ))}
              </div>
            )
          ) : items.length === 0 ? (
            <div className="rules-empty-card">
              <IonIcon icon={documentTextOutline} className="rules-empty-icon" />
              <h3>{t('no_rules_data')}</h3>
            </div>
          ) : (
            <div className="rules-items-list">
              {items.map((item, index) => {
                const ruleNumber = index + 1;
                const isSecondPddChapter = selectedSection === 'pdd'
                  && (
                    selectedChapter?.id === 107
                    || /^ii\./i.test(String(selectedChapter?.title ?? '').trim())
                    || /^2\./.test(String(selectedChapter?.title ?? '').trim())
                  );
                const inlineImage = isSecondPddChapter
                  ? SECOND_PDD_CHAPTER_IMAGE_BY_NUMBER[ruleNumber] ?? null
                  : null;
                const roadMarkingImage = selectedSection === 'markings' && item.image
                  ? ROAD_MARKING_IMAGE_BY_FILENAME[item.image] ?? null
                  : null;
                const cardImage = inlineImage ?? roadMarkingImage;
                const itemNumberLabel = selectedSection === 'markings' && item.number
                  ? `${t('rule_marker')} ${item.number}`
                  : `${t('rule_item')} ${ruleNumber}`;
                const renderedItemHtml = linkedItemHtmlById[item.id] ?? item.content;

                return (
                  <article key={item.id} className="rules-item-card">
                    <div className="rules-item-head">
                      <span className="rules-item-number">
                        {itemNumberLabel}
                      </span>
                    </div>

                    {cardImage && (
                      <div className="rules-item-image-wrap">
                        <img src={cardImage} alt={`rule-${item.number || ruleNumber}`} className="rules-item-image" />
                      </div>
                    )}

                    <div
                      className="rules-item-html"
                      onClick={handleReferenceClick}
                      dangerouslySetInnerHTML={{ __html: renderedItemHtml }}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>

      <IonModal
        isOpen={Boolean(referencePreview)}
        onDidDismiss={() => setReferencePreview(null)}
        className="rules-reference-modal"
      >
        <IonContent className="rules-reference-content">
          <div className="rules-reference-wrap">
            <div className="rules-reference-head">
              <div className="rules-reference-title">
                {referencePreview?.kind === 'marking' ? t('rule_marker') : t('sign_details')}
              </div>
              <button type="button" className="rules-reference-close" onClick={() => setReferencePreview(null)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            {referencePreview && (
              <>
                <div className="rules-reference-image-wrap">
                  {referencePreview.imageSrc ? (
                    <img
                      src={referencePreview.imageSrc}
                      alt={referencePreview.title}
                      className="rules-reference-image"
                    />
                  ) : (
                    <div className="rules-reference-image-empty">
                      <IonIcon icon={imageOutline} />
                    </div>
                  )}
                </div>

                <div className="rules-reference-meta">
                  {t('sign_number')} {referencePreview.code}
                </div>
                <h2 className="rules-reference-name">{referencePreview.title}</h2>

                {referencePreview.htmlContent ? (
                  <div
                    className="rules-reference-html"
                    onClick={handleReferenceClick}
                    dangerouslySetInnerHTML={{
                      __html: linkifyRuleContent(
                        referencePreview.htmlContent,
                        { excludeCodes: new Set(extractRoadCodes(referencePreview.code)) },
                      ),
                    }}
                  />
                ) : (
                  <p className="rules-reference-description">{referencePreview.description}</p>
                )}

                <IonButton expand="block" className="rules-reference-close-btn" onClick={() => setReferencePreview(null)}>
                  {t('close')}
                </IonButton>
              </>
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Rules;
