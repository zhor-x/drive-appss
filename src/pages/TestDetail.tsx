import {
    IonAlert,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
} from '@ionic/react';
import {useIonViewDidEnter, useIonViewWillLeave} from '@ionic/react';
import {Capacitor} from '@capacitor/core';
import {
    checkmarkCircleOutline,
    closeOutline,
    documentTextOutline,
    refreshOutline,
    shareSocialOutline,
    star,
    starOutline,
    timeOutline,
} from 'ionicons/icons';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useHistory, useLocation, useParams} from 'react-router-dom';
import badImage from '../assets/images/bad.jpg';
import goodImage from '../assets/images/good.jpg';
import lilBadImage from '../assets/images/lil-bad.jpg';
import notBadImage from '../assets/images/not-bad.jpg';
import {useLanguage} from '../context/LanguageContext';
import {dbService, QuestionItem} from '../services/DatabaseService';
import './TestDetail.css';

type AnswerState = {
    answerId: number;
    isRight: boolean;
};

type ResultTone = 'good' | 'mid' | 'bad';

type ResultPresentation = {
    image: string;
    percent: number;
    text: string;
    tone: ResultTone;
};

type CommitAnswerResult = {
    committed: boolean;
    answersSnapshot: Record<number, AnswerState>;
};

type IonBackButtonEvent = CustomEvent<{
    register: (priority: number, handler: () => void | Promise<void>) => void;
}>;

const countCorrectAnswers = (answersMap: Record<number, AnswerState>) =>
    Object.values(answersMap).filter((answer) => answer.isRight).length;

const getResultPresentation = (score: number, total: number): ResultPresentation => {
    const safeScore = Math.max(score, 0);
    const safeTotal = Math.max(total, 1);
    const percent = Math.round((safeScore / safeTotal) * 100);

    if (percent >= 85) {
        return {text: 'Գերազանց արդյունք', tone: 'good', image: goodImage, percent};
    }
    if (percent >= 65) {
        return {text: 'Լավ արդյունք', tone: 'good', image: notBadImage, percent};
    }
    if (percent >= 45) {
        return {text: 'Վատ չէ, բայց դեռ աշխատելու տեղ կա', tone: 'mid', image: lilBadImage, percent};
    }

    return {text: 'Կա աշխատելու տեղ', tone: 'bad', image: badImage, percent};
};

const getWrongAnswerAnalysis = (wrongCount: number): string => {
    if (wrongCount === 0) {
        return 'Սխալներ չկան';
    }

    if (wrongCount <= 2) {
        return 'Սխալ՝ անուշադրությունից';
    }

    if (wrongCount <= 5) {
        return 'Կան անուշադրության սխալներ';
    }

    return 'Պետք է կրկնել թեման';
};

const questionImageLoaders = import.meta.glob('../assets/images/questions/**/*', {
    import: 'default',
    query: '?url',
}) as Record<string, () => Promise<string>>;

const questionImageLoaderByName = Object.entries(questionImageLoaders).reduce<Record<string, () => Promise<string>>>((acc, [path, loader]) => {
    const fileName = path.split('/').pop()?.toLowerCase();
    if (fileName) {
        acc[fileName] = loader;
    }
    return acc;
}, {});

const questionImageSrcCache = new Map<string, string | null>();

const loadLocalQuestionImage = async (imagePath?: string | null): Promise<string | null> => {
    if (!imagePath) {
        return null;
    }

    const fileName = imagePath.split('/').pop()?.trim().toLowerCase();
    if (!fileName) {
        return null;
    }

    const cachedSrc = questionImageSrcCache.get(fileName);
    if (cachedSrc !== undefined) {
        return cachedSrc;
    }

    const loader = questionImageLoaderByName[fileName];
    if (!loader) {
        questionImageSrcCache.set(fileName, null);
        return null;
    }

    try {
        const src = await loader();
        questionImageSrcCache.set(fileName, src);
        return src;
    } catch (err) {
        console.warn('Failed to load question image', imagePath, err);
        questionImageSrcCache.set(fileName, null);
        return null;
    }
};

const EXAM_DURATION_SECONDS = 30 * 60;
const HARDWARE_BACK_PRIORITY = 1000;
const THEORY_INITIAL_QUESTION_BATCH = 1;
const THEORY_NEARBY_QUESTION_BATCH = 3;
const THEORY_BACKGROUND_QUESTION_BATCH = 12;

const TestDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const history = useHistory();
    const {langId, t} = useLanguage();

    const routeId = decodeURIComponent(id);
    const itemId = Number(routeId);
    const isTheoryMode = location.pathname.startsWith('/theory-tests/');
    const isSmartTrainingMode = location.pathname.startsWith('/smart-training/');
    const isPracticeMode = isTheoryMode || isSmartTrainingMode;
    const backHref = isTheoryMode
        ? '/theory-tests'
        : isSmartTrainingMode
            ? '/smart-training'
            : '/tests';

    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [theoryQuestionIds, setTheoryQuestionIds] = useState<number[]>([]);
    const [theoryQuestionsById, setTheoryQuestionsById] = useState<Record<number, QuestionItem>>({});
    const [practiceTitle, setPracticeTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<number, AnswerState>>({});
    const [draftAnswersByQuestionId, setDraftAnswersByQuestionId] = useState<Record<number, number>>({});
    const [favoriteQuestionIds, setFavoriteQuestionIds] = useState<Record<number, boolean>>({});
    const [showResult, setShowResult] = useState(false);
    const [resultDurationSec, setResultDurationSec] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [examReviewMode, setExamReviewMode] = useState(false);
    const [examTimeLeftSec, setExamTimeLeftSec] = useState(EXAM_DURATION_SECONDS);
    const [examTimedOut, setExamTimedOut] = useState(false);
    const [currentQuestionImageSrc, setCurrentQuestionImageSrc] = useState<string | null>(null);

    const completionSavedRef = useRef(false);
    const examFinalizedRef = useRef(false);
    const touchStartXRef = useRef<number | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const startedAtRef = useRef<number>(Date.now());
    const scrollBodyRef = useRef<HTMLDivElement | null>(null);
    const backButtonListenerRef = useRef<((event: IonBackButtonEvent) => void) | null>(null);
    const hardwareBackHandlerRef = useRef<() => void>(() => {});
    const examSessionIdRef = useRef<number | null>(null);
    const theoryQuestionsByIdRef = useRef<Record<number, QuestionItem>>({});
    const pendingTheoryQuestionIdsRef = useRef<Set<number>>(new Set());
    const theoryLoadVersionRef = useRef(0);

    const mergeTheoryQuestions = useCallback((loadedQuestions: QuestionItem[]) => {
        if (loadedQuestions.length === 0) {
            return;
        }

        setTheoryQuestionsById((prev) => {
            let changed = false;
            const next = {...prev};

            for (const question of loadedQuestions) {
                if (next[question.id] !== question) {
                    next[question.id] = question;
                    changed = true;
                }
            }

            if (!changed) {
                return prev;
            }

            theoryQuestionsByIdRef.current = next;
            return next;
        });
    }, []);

    const loadTheoryQuestionBatch = useCallback(async (questionIdsToLoad: number[], loadVersion: number) => {
        const batchIds = questionIdsToLoad.filter(
            (questionId) =>
                questionId > 0
                && !theoryQuestionsByIdRef.current[questionId]
                && !pendingTheoryQuestionIdsRef.current.has(questionId),
        );

        if (batchIds.length === 0) {
            return;
        }

        for (const questionId of batchIds) {
            pendingTheoryQuestionIdsRef.current.add(questionId);
        }

        try {
            const loadedQuestions = await dbService.getQuestionsByIds(batchIds, langId);
            if (theoryLoadVersionRef.current !== loadVersion) {
                return;
            }

            mergeTheoryQuestions(loadedQuestions);
        } catch (err) {
            if (theoryLoadVersionRef.current === loadVersion) {
                console.error('Failed to load theory question batch', err);
            }
        } finally {
            for (const questionId of batchIds) {
                pendingTheoryQuestionIdsRef.current.delete(questionId);
            }
        }
    }, [langId, mergeTheoryQuestions]);

    const preloadTheoryQuestions = useCallback(async (questionIdsToLoad: number[], loadVersion: number) => {
        for (let index = 0; index < questionIdsToLoad.length; index += THEORY_BACKGROUND_QUESTION_BATCH) {
            if (theoryLoadVersionRef.current !== loadVersion) {
                return;
            }

            await loadTheoryQuestionBatch(
                questionIdsToLoad.slice(index, index + THEORY_BACKGROUND_QUESTION_BATCH),
                loadVersion,
            );

            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }
    }, [loadTheoryQuestionBatch]);

    const ensureTheoryQuestionLoaded = useCallback((index: number) => {
        const questionId = theoryQuestionIds[index];
        if (!isPracticeMode || !questionId) {
            return;
        }

        const loadVersion = theoryLoadVersionRef.current;
        const nearbyQuestionIds = theoryQuestionIds.slice(index, index + THEORY_NEARBY_QUESTION_BATCH);
        void loadTheoryQuestionBatch(nearbyQuestionIds, loadVersion);
    }, [isPracticeMode, loadTheoryQuestionBatch, theoryQuestionIds]);

    useEffect(() => {
        let cancelled = false;

        const loadQuestions = async () => {
            setLoading(true);
            setShowResult(false);
            setCurrentIndex(0);
            setQuestions([]);
            setTheoryQuestionIds([]);
            setTheoryQuestionsById({});
            setPracticeTitle('');
            setAnswersByQuestionId({});
            setDraftAnswersByQuestionId({});
            setFavoriteQuestionIds({});
            completionSavedRef.current = false;
            examFinalizedRef.current = false;
            setResultDurationSec(0);
            setExamReviewMode(false);
            setExamTimeLeftSec(EXAM_DURATION_SECONDS);
            setExamTimedOut(false);
            startedAtRef.current = Date.now();
            examSessionIdRef.current = null;
            theoryQuestionsByIdRef.current = {};
            pendingTheoryQuestionIdsRef.current.clear();

            const loadVersion = ++theoryLoadVersionRef.current;

            try {
                if (isPracticeMode) {
                    const questionIds = isTheoryMode
                        ? await dbService.getQuestionIdsByGroup(itemId)
                        : await dbService.getSmartTrainingQuestionIds(routeId, langId);

                    if (!cancelled) {
                        if (isTheoryMode) {
                            setPracticeTitle(`Թեմա ${itemId}`);
                        } else {
                            setPracticeTitle(dbService.getSmartTrainingFocusMeta(routeId, langId)?.title ?? t('smart_training'));
                        }
                    }

                    if (cancelled || theoryLoadVersionRef.current !== loadVersion) {
                        return;
                    }

                    setTheoryQuestionIds(questionIds);

                    if (questionIds.length === 0) {
                        setLoading(false);
                        return;
                    }

                    void (async () => {
                        try {
                            const favoriteIds = await dbService.getFavoriteQuestionIds(questionIds);
                            if (!cancelled && theoryLoadVersionRef.current === loadVersion) {
                                const byId = favoriteIds.reduce<Record<number, boolean>>((acc, qId) => {
                                    acc[qId] = true;
                                    return acc;
                                }, {});
                                setFavoriteQuestionIds(byId);
                            }
                        } catch (err) {
                            if (!cancelled && theoryLoadVersionRef.current === loadVersion) {
                                console.error('Failed to load favorite questions', err);
                            }
                        }
                    })();

                    await loadTheoryQuestionBatch(
                        questionIds.slice(0, THEORY_INITIAL_QUESTION_BATCH),
                        loadVersion,
                    );

                    if (!cancelled && theoryLoadVersionRef.current === loadVersion) {
                        setLoading(false);
                    }

                    void preloadTheoryQuestions(
                        questionIds.slice(THEORY_INITIAL_QUESTION_BATCH),
                        loadVersion,
                    );

                    return;
                }

                const data = await dbService.getQuestionsByTest(itemId, langId);

                if (!cancelled) {
                    setQuestions(data);
                    setLoading(false);
                }

                const questionIds = data.map((q) => q.id);
                if (questionIds.length === 0) {
                    return;
                }

                try {
                    examSessionIdRef.current = await dbService.startExamTestSession(itemId);
                } catch (err) {
                    console.error('Failed to start exam session', err);
                    examSessionIdRef.current = null;
                }

                const favoriteIds = await dbService.getFavoriteQuestionIds(questionIds);

                if (!cancelled) {
                    const byId = favoriteIds.reduce<Record<number, boolean>>((acc, qId) => {
                        acc[qId] = true;
                        return acc;
                    }, {});
                    setFavoriteQuestionIds(byId);
                }
            } catch (err) {
                console.error('Failed to load quiz data', err);
                if (!cancelled) {
                    setQuestions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadQuestions();

        return () => {
            cancelled = true;
        };
    }, [isPracticeMode, isTheoryMode, itemId, langId, loadTheoryQuestionBatch, preloadTheoryQuestions, routeId, t]);

    useEffect(() => {
        const activeDot = document.getElementById(`theory-dot-${currentIndex}`);
        activeDot?.scrollIntoView({block: 'nearest', inline: 'center', behavior: 'smooth'});
    }, [currentIndex]);

    useEffect(() => {
        scrollBodyRef.current?.scrollTo({top: 0, behavior: 'smooth'});
    }, [currentIndex]);

    const orderedQuestionIds = useMemo(
        () => (isPracticeMode ? theoryQuestionIds : questions.map((question) => question.id)),
        [isPracticeMode, questions, theoryQuestionIds],
    );

    const totalQuestions = orderedQuestionIds.length;
    const currentQuestionId = orderedQuestionIds[currentIndex] ?? null;
    const currentQuestion = currentQuestionId
        ? (isPracticeMode ? theoryQuestionsById[currentQuestionId] ?? null : questions[currentIndex] ?? null)
        : null;
    const isCurrentQuestionLoading = isPracticeMode && !loading && totalQuestions > 0 && currentQuestionId !== null && !currentQuestion;

    useEffect(() => {
        if (!isPracticeMode || totalQuestions === 0) {
            return;
        }

        ensureTheoryQuestionLoaded(currentIndex);
    }, [currentIndex, ensureTheoryQuestionLoaded, isPracticeMode, totalQuestions]);

    useEffect(() => {
        let cancelled = false;

        setCurrentQuestionImageSrc(null);

        const imagePath = currentQuestion?.image;
        if (!imagePath) {
            return () => {
                cancelled = true;
            };
        }

        const loadImage = async () => {
            const src = await loadLocalQuestionImage(imagePath);
            if (!cancelled) {
                setCurrentQuestionImageSrc(src);
            }
        };

        void loadImage();

        return () => {
            cancelled = true;
        };
    }, [currentQuestion?.image]);

    const currentAnswer = currentQuestion ? answersByQuestionId[currentQuestion.id] : undefined;
    const draftSelectedAnswerId = currentQuestion ? draftAnswersByQuestionId[currentQuestion.id] ?? null : null;
    const selectedAnswerId = draftSelectedAnswerId ?? currentAnswer?.answerId ?? null;
    const isAnswered = Boolean(currentAnswer);
    const hasDraftSelection = selectedAnswerId !== null;
    const isCurrentFavorite = currentQuestion ? Boolean(favoriteQuestionIds[currentQuestion.id]) : false;

    const score = useMemo(
        () => countCorrectAnswers(answersByQuestionId),
        [answersByQuestionId],
    );

    const passThreshold = useMemo(() => {
        if (totalQuestions <= 0) return 0;
        return Math.max(totalQuestions - 2, 1);
    }, [totalQuestions]);

    const isPassed = score >= passThreshold;
    const wrongCount = Math.max(totalQuestions - score, 0);

    const resultPresentation = useMemo(() => getResultPresentation(score, totalQuestions), [score, totalQuestions]);
    const theoryAnswerAnalysis = useMemo(() => getWrongAnswerAnalysis(wrongCount), [wrongCount]);

    const formattedResultDuration = useMemo(() => {
        const totalSec = Math.max(resultDurationSec, 0);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, [resultDurationSec]);

    const formattedExamTimeLeft = useMemo(() => {
        const totalSec = Math.max(examTimeLeftSec, 0);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, [examTimeLeftSec]);

    const examResultAnalysis = useMemo(() => {
        if (examTimedOut) {
            return 'Ժամանակը ավարտվել է';
        }

        return isPassed ? t('exam_passed') : t('exam_failed');
    }, [examTimedOut, isPassed, t]);

    const shouldRevealAnswerFeedback = isPracticeMode ? isAnswered : examReviewMode;
    const canGoNext = hasDraftSelection || isAnswered || (!isPracticeMode && examReviewMode);

    const detailTitle = useMemo(() => {
        if (isSmartTrainingMode) {
            return `${practiceTitle || t('smart_training')}: Հարց #${currentIndex + 1}`;
        }

        if (isTheoryMode) {
            return `Թեմա ${itemId}: Հարց #${currentIndex + 1}`;
        }

        return `Թեստ ${itemId}: Հարց #${currentIndex + 1}`;
    }, [currentIndex, isSmartTrainingMode, isTheoryMode, itemId, practiceTitle, t]);

    const goToQuestion = (index: number) => {
        if (index < 0 || index >= totalQuestions) return;
        setCurrentIndex(index);
        if (isPracticeMode) {
            ensureTheoryQuestionLoaded(index);
        }
    };

    const handleAnswer = (answerId: number) => {
        if (!currentQuestion) return;

        const questionId = currentQuestion.id;
        if (isPracticeMode && answersByQuestionId[questionId]) {
            return;
        }

        const committedAnswerId = answersByQuestionId[questionId]?.answerId ?? null;

        setDraftAnswersByQuestionId((prev) => {
            const next = {...prev};

            if (committedAnswerId === answerId) {
                delete next[questionId];
            } else {
                next[questionId] = answerId;
            }

            return next;
        });
    };

    const commitCurrentAnswer = async (): Promise<CommitAnswerResult> => {
        if (!currentQuestion) {
            return {
                committed: true,
                answersSnapshot: answersByQuestionId,
            };
        }

        const questionId = currentQuestion.id;
        const committedAnswer = answersByQuestionId[questionId];
        const draftAnswerId = draftAnswersByQuestionId[questionId];

        if (isPracticeMode && committedAnswer) {
            if (draftAnswerId !== undefined) {
                setDraftAnswersByQuestionId((prev) => {
                    const next = {...prev};
                    delete next[questionId];
                    return next;
                });
            }

            return {
                committed: true,
                answersSnapshot: answersByQuestionId,
            };
        }

        if (committedAnswer && (draftAnswerId === undefined || draftAnswerId === committedAnswer.answerId)) {
            if (draftAnswerId === committedAnswer.answerId) {
                setDraftAnswersByQuestionId((prev) => {
                    const next = {...prev};
                    delete next[questionId];
                    return next;
                });
            }
            return {
                committed: true,
                answersSnapshot: answersByQuestionId,
            };
        }

        if (draftAnswerId === undefined) {
            return {
                committed: false,
                answersSnapshot: answersByQuestionId,
            };
        }

        const selectedAnswer = currentQuestion.answers.find((answer) => answer.id === draftAnswerId);
        if (!selectedAnswer) {
            return {
                committed: false,
                answersSnapshot: answersByQuestionId,
            };
        }

        const isRight = selectedAnswer.is_right;
        const nextAnswersByQuestionId = {
            ...answersByQuestionId,
            [questionId]: {
                answerId: draftAnswerId,
                isRight,
            },
        };

        setAnswersByQuestionId(nextAnswersByQuestionId);

        setDraftAnswersByQuestionId((prev) => {
            const next = {...prev};
            delete next[questionId];
            return next;
        });

        try {
            if (isPracticeMode) {
                await dbService.saveUserAnswer(questionId, draftAnswerId, currentQuestion.group_id, isRight);
            } else {
                await dbService.saveExamTestAnswer(
                    examSessionIdRef.current ?? 0,
                    itemId,
                    questionId,
                    draftAnswerId,
                    isRight,
                );
            }
        } catch (err) {
            console.error('Failed to save answer', err);
        }

        return {
            committed: true,
            answersSnapshot: nextAnswersByQuestionId,
        };
    };

    const finalizeExamIfNeeded = async (elapsedSeconds: number, correctAnswersCount: number) => {
        if (isPracticeMode || completionSavedRef.current) {
            return;
        }

        completionSavedRef.current = true;

        try {
            await dbService.completeExamTestSession(
                examSessionIdRef.current,
                itemId,
                correctAnswersCount,
                questions.length,
                elapsedSeconds,
            );
        } catch (err) {
            console.error('Failed to save exam completion', err);
        }
    };

    const finishExam = async (timedOut = false, answersSnapshot: Record<number, AnswerState> = answersByQuestionId) => {
        if (isPracticeMode || examFinalizedRef.current) {
            return;
        }

        examFinalizedRef.current = true;
        const finalScore = countCorrectAnswers(answersSnapshot);

        const elapsedSeconds = Math.min(
            Math.round((Date.now() - startedAtRef.current) / 1000),
            EXAM_DURATION_SECONDS,
        );

        setResultDurationSec(elapsedSeconds);
        setExamTimeLeftSec(Math.max(EXAM_DURATION_SECONDS - elapsedSeconds, 0));
        setExamTimedOut(timedOut);
        setExamReviewMode(true);
        await finalizeExamIfNeeded(elapsedSeconds, finalScore);
        setShowResult(true);
    };

    useEffect(() => {
        if (isPracticeMode || loading || showResult || examReviewMode || questions.length === 0) {
            return;
        }

        const tick = () => {
            const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
            const next = Math.max(EXAM_DURATION_SECONDS - elapsed, 0);
            setExamTimeLeftSec(next);
        };

        tick();

        const intervalId = window.setInterval(tick, 1000);
        return () => window.clearInterval(intervalId);
    }, [examReviewMode, isPracticeMode, loading, questions.length, showResult]);

    useEffect(() => {
        if (isPracticeMode || loading || showResult || examReviewMode || questions.length === 0) {
            return;
        }

        if (examTimeLeftSec <= 0) {
            void finishExam(true);
        }
    }, [examReviewMode, examTimeLeftSec, isPracticeMode, loading, questions.length, showResult]);

    const handleNext = async () => {
        if (!isPracticeMode && examReviewMode) {
            if (currentIndex < questions.length - 1) {
                goToQuestion(currentIndex + 1);
            } else {
                history.push('/tests');
            }
            return;
        }

        const { committed, answersSnapshot } = await commitCurrentAnswer();
        if (!committed) {
            return;
        }

        if (currentIndex < totalQuestions - 1) {
            goToQuestion(currentIndex + 1);
            return;
        }

        if (!isPracticeMode) {
            await finishExam(false, answersSnapshot);
            return;
        }

        setResultDurationSec(Math.round((Date.now() - startedAtRef.current) / 1000));
        setShowResult(true);
    };

    const navigateBackFromDetail = () => {
        if (isPracticeMode) {
            history.replace(backHref);
            return;
        }

        if (showResult || examReviewMode) {
            history.replace('/tests');
            return;
        }

        setShowExitConfirm(true);
    };

    hardwareBackHandlerRef.current = () => {
        if (showExitConfirm) {
            setShowExitConfirm(false);
            return;
        }

        navigateBackFromDetail();
    };

    const attachBackButtonListener = useCallback(() => {
        if (Capacitor.getPlatform() !== 'android' || backButtonListenerRef.current || typeof document === 'undefined') {
            return;
        }

        const listener = (event: IonBackButtonEvent) => {
            event.detail.register(HARDWARE_BACK_PRIORITY, () => {
                hardwareBackHandlerRef.current();
            });
        };

        document.addEventListener('ionBackButton', listener as EventListener);
        backButtonListenerRef.current = listener;
    }, []);

    const detachBackButtonListener = useCallback(() => {
        if (!backButtonListenerRef.current || typeof document === 'undefined') {
            return;
        }

        document.removeEventListener('ionBackButton', backButtonListenerRef.current as EventListener);
        backButtonListenerRef.current = null;
    }, []);

    useIonViewDidEnter(() => {
        attachBackButtonListener();
    });

    useIonViewWillLeave(() => {
        detachBackButtonListener();
    });

    const handleClose = () => {
        navigateBackFromDetail();
    };

    const handleExitConfirm = () => {
        setShowExitConfirm(false);
        history.replace('/tests');
    };

    const handleExitCancel = () => {
        setShowExitConfirm(false);
    };

    const restartTheory = () => {
        setAnswersByQuestionId({});
        setDraftAnswersByQuestionId({});
        setCurrentIndex(0);
        setShowResult(false);
        setResultDurationSec(0);
        startedAtRef.current = Date.now();
    };

    const openTheoryAnswers = () => {
        setCurrentIndex(0);
        setShowResult(false);
    };

    const openExamAnswers = () => {
        setCurrentIndex(0);
        setShowResult(false);
        setExamReviewMode(true);
    };

    const shareTheoryResult = async () => {
        const text = `${resultPresentation.text}\n${score} / ${totalQuestions} հարց\nԺամանակ՝ ${formattedResultDuration}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Drive&Go',
                    text,
                });
            }
        } catch {
            // user canceled sharing
        }
    };

    const toggleCurrentFavorite = async () => {
        if (!currentQuestion) return;

        try {
            const isFavorite = await dbService.toggleFavoriteQuestion(currentQuestion.id);
            setFavoriteQuestionIds((prev) => ({
                ...prev,
                [currentQuestion.id]: isFavorite,
            }));
        } catch (err) {
            console.error('Failed to toggle favorite', err);
        }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.changedTouches[0];
        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartXRef.current === null || touchStartYRef.current === null) {
            return;
        }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartXRef.current;
        const dy = touch.clientY - touchStartYRef.current;

        touchStartXRef.current = null;
        touchStartYRef.current = null;

        if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) {
            return;
        }

        if (dx < 0) {
            goToQuestion(currentIndex + 1);
        } else {
            goToQuestion(currentIndex - 1);
        }
    };

    if (loading) {
        return (
            <IonPage>
                <IonContent className="ion-padding">
                    <div style={{display: 'flex', justifyContent: 'center', paddingTop: '48px'}}>
                        <IonSpinner name="crescent" color="primary"/>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    if (!totalQuestions) {
        return (
            <IonPage>
                <IonHeader className="ion-no-border">
                    <IonToolbar>
                        <IonButtons slot="start">
                            <IonBackButton defaultHref={backHref}/>
                        </IonButtons>
                        <IonTitle>{isPracticeMode ? (isSmartTrainingMode ? t('smart_training') : t('theory_topics')) : t('exam_tests')}</IonTitle>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="ion-padding">
                    <div style={{textAlign: 'center', marginTop: '80px', color: '#64748b'}}>
                        <h3>{t('no_questions')}</h3>
                        <IonButton routerLink={backHref} style={{marginTop: '16px'}}>
                            {t('back_to_tests')}
                        </IonButton>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    if (showResult) {
        if (isPracticeMode) {
            return (
                <IonPage className="theory-detail-page">
                    <IonContent fullscreen className="theory-detail-content">
                        <div className="theory-result-wrap theory-result-screen">
                            <div className="close-box">
                                <button type="button" className="theory-close-btn" onClick={handleClose}>
                                    <IonIcon icon={closeOutline}/>
                                </button>
                            </div>

                            <h1 className="theory-result-header-title">Արդյունք</h1>

                            <div className="theory-result-card">
                                <h2 className={`theory-result-status is-${resultPresentation.tone}`}>{resultPresentation.text}</h2>
                                <p className="theory-result-analysis">{theoryAnswerAnalysis}</p>

                                <div className="theory-result-illustration-box">
                                    <img src={resultPresentation.image} alt="result" className="theory-result-illustration"/>
                                </div>

                                <div className="theory-result-meta-row">
                                    <div className="theory-result-meta-item">
                                        <IonIcon icon={checkmarkCircleOutline}/>
                                        <span>
                      {score} / {totalQuestions} հարց
                    </span>
                                    </div>

                                    <div className="theory-result-meta-item">
                                        <IonIcon icon={timeOutline}/>
                                        <span>{formattedResultDuration}</span>
                                    </div>
                                </div>
                            </div>

                            <IonButton expand="block" fill="clear" className="theory-flat-action-btn"
                                       onClick={restartTheory}>
                                <IonIcon slot="start" icon={refreshOutline}/>
                                Կրկնել նորից
                            </IonButton>

                            <IonButton expand="block" fill="clear" className="theory-flat-action-btn"
                                       onClick={openTheoryAnswers}>
                                <IonIcon slot="start" icon={documentTextOutline}/>
                                Իմ պատասխանները
                            </IonButton>

                            <IonButton expand="block" className="theory-share-btn" onClick={shareTheoryResult}>
                                <IonIcon slot="start" icon={shareSocialOutline}/>
                                Կիսվել ընկերների հետ
                            </IonButton>
                        </div>
                    </IonContent>
                </IonPage>
            );
        }

        return (
            <IonPage className="theory-detail-page">
                <IonContent fullscreen className="theory-detail-content">
                    <div className="theory-result-wrap theory-result-screen">
                        <div className="close-box">
                            <button type="button" className="theory-close-btn" onClick={handleClose}>
                                <IonIcon icon={closeOutline}/>
                            </button>
                        </div>

                        <h1 className="theory-result-header-title">{t('result')}</h1>

                        <div className="theory-result-card">
                            <h2 className={`theory-result-status is-${resultPresentation.tone}`}>{resultPresentation.text}</h2>
                            <p className="theory-result-analysis">{examResultAnalysis}</p>

                            <div className="theory-result-illustration-box">
                                <img src={resultPresentation.image} alt="result" className="theory-result-illustration"/>
                            </div>

                            <div className="theory-result-meta-row">
                                <div className="theory-result-meta-item">
                                    <IonIcon icon={checkmarkCircleOutline}/>
                                    <span>
                                        {score} / {totalQuestions} հարց
                                    </span>
                                </div>

                                <div className="theory-result-meta-item">
                                    <IonIcon icon={timeOutline}/>
                                    <span>{formattedResultDuration}</span>
                                </div>
                            </div>
                        </div>

                        <IonButton
                            expand="block"
                            fill="clear"
                            className="theory-flat-action-btn"
                            onClick={openExamAnswers}
                        >
                            <IonIcon slot="start" icon={documentTextOutline}/>
                            Իմ պատասխանները
                        </IonButton>

                        <IonButton expand="block" className="theory-share-btn" onClick={() => history.replace('/tests')}>
                            {t('finish')}
                        </IonButton>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage className="theory-detail-page">
            <IonContent fullscreen className="theory-detail-content" scrollY={false}>
                <div className="theory-detail-wrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <div className="theory-top-fixed">
                        <div className="close-box">
                            <button type="button" className="theory-close-btn" onClick={handleClose}>
                                <IonIcon icon={closeOutline}/>
                            </button>
                        </div>
                        <div className='ion-flex ion-flex-row ion-justify-content-between ion-align-content-center'>
                            <h1 className="theory-detail-title">{detailTitle}</h1>

                            {!isPracticeMode && !examReviewMode && (
                                <div className={`theory-exam-timer${examTimeLeftSec <= 5 * 60 ? ' is-danger' : ''}`}>
                                    <IonIcon icon={timeOutline}/>
                                    <span>{formattedExamTimeLeft}</span>
                                </div>
                            )}
                        </div>
                        <div className="theory-dots-row">
                            {orderedQuestionIds.map((questionId, index) => {
                                const answered = Boolean(answersByQuestionId[questionId]);
                                const isRight = answersByQuestionId[questionId]?.isRight ?? null;
                                const isActive = index === currentIndex;

                                const colorClass =
                                    answered && (isPracticeMode || examReviewMode)
                                        ? isRight
                                            ? ' is-correct'
                                            : ' is-wrong'
                                        : '';

                                return (
                                    <button
                                        key={questionId}
                                        id={`theory-dot-${index}`}
                                        type="button"
                                        className={`theory-dot-btn${isActive ? ' is-active' : ''}${colorClass}`}
                                        onClick={() => goToQuestion(index)}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div ref={scrollBodyRef} className="theory-scrollable-body">
                        {isCurrentQuestionLoading ? (
                            <div className="theory-question-loader">
                                <IonSpinner name="crescent" color="primary"/>
                            </div>
                        ) : (
                            <>
                                {currentQuestionImageSrc && (
                                    <div className="theory-image-wrap">
                                        <img src={currentQuestionImageSrc} alt="question" className="theory-image"/>
                                    </div>
                                )}

                                <h2 className="theory-question-text">{currentQuestion?.title}</h2>

                                <div className="theory-answer-list">
                                    {currentQuestion?.answers.map((answer, index) => {
                                        const isSelected = selectedAnswerId === answer.id;
                                        const showRight = shouldRevealAnswerFeedback && answer.is_right;
                                        const showWrong = shouldRevealAnswerFeedback && isSelected && !answer.is_right;
                                        const answerDisabled = examReviewMode || (isPracticeMode && isAnswered);

                                        return (
                                            <button
                                                key={answer.id}
                                                type="button"
                                                className={`theory-answer-btn${isSelected ? ' is-selected' : ''}${showRight ? ' is-right' : ''}${showWrong ? ' is-wrong' : ''}`}
                                                onClick={() => handleAnswer(answer.id)}
                                                disabled={answerDisabled}
                                            >
                                                <span className="theory-answer-number">{index + 1}.</span>
                                                <span className="theory-answer-text">{answer.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div className="theory-actions-row">
                            <div className="theory-footer-row">
                                {canGoNext ? (
                                    <IonButton expand="block" className="theory-next-btn" onClick={handleNext}>
                                        {currentIndex === totalQuestions - 1 ? t('finish') : 'Հաջորդ հարց'}
                                    </IonButton>
                                ) : (
                                    <div className="theory-footer-placeholder"/>
                                )}

                                <button
                                    type="button"
                                    className={`theory-star-btn${isCurrentFavorite ? ' is-active' : ''}`}
                                    onClick={toggleCurrentFavorite}
                                >
                                    <IonIcon icon={isCurrentFavorite ? star : starOutline}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </IonContent>

            <IonAlert
                isOpen={showExitConfirm}
                header={t('stop_training_title')}
                message={t('stop_training_message')}
                cssClass="app-alert"
                backdropDismiss={false}
                buttons={[
                    {
                        text: t('no'),
                        role: 'cancel',
                        cssClass: 'app-alert-cancel',
                        handler: handleExitCancel,
                    },
                    {
                        text: t('yes'),
                        role: 'destructive',
                        cssClass: 'app-alert-danger',
                        handler: handleExitConfirm,
                    },
                ]}
                onDidDismiss={handleExitCancel}
            />
        </IonPage>
    );
};

export default TestDetail;
