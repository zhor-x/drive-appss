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
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useHistory, useLocation, useParams} from 'react-router-dom';
import {useLanguage} from '../context/LanguageContext';
import {dbService, QuestionItem} from '../services/DatabaseService';
import goodImage from '../assets/images/good.jpg';
import notBadImage from '../assets/images/not-bad.jpg';
import lilBadImage from '../assets/images/lil-bad.jpg';
import badImage from '../assets/images/bad.jpg';
import './TestDetail.css';

type AnswerState = {
    answerId: number;
    isRight: boolean;
};

const questionImageModules = import.meta.glob('../assets/images/questions/**/*', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const questionImageByName = Object.entries(questionImageModules).reduce<Record<string, string>>((acc, [path, src]) => {
    const fileName = path.split('/').pop()?.toLowerCase();
    if (fileName) {
        acc[fileName] = src;
    }
    return acc;
}, {});

const resolveLocalQuestionImage = (imagePath?: string | null): string | null => {
    if (!imagePath) {
        return null;
    }

    const fileName = imagePath.split('/').pop()?.trim().toLowerCase();
    if (!fileName) {
        return null;
    }

    return questionImageByName[fileName] ?? null;
};

const EXAM_DURATION_SECONDS = 30 * 60;

const TestDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const location = useLocation();
    const history = useHistory();
    const {langId, t} = useLanguage();

    const testId = Number(id);
    const isTheoryMode = location.pathname.startsWith('/theory-tests/');
    const backHref = isTheoryMode ? '/theory-tests' : '/tests';

    const [questions, setQuestions] = useState<QuestionItem[]>([]);
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

    const completionSavedRef = useRef(false);
    const examFinalizedRef = useRef(false);
    const touchStartXRef = useRef<number | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const startedAtRef = useRef<number>(Date.now());
    const scrollBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadQuestions = async () => {
            setLoading(true);
            setShowResult(false);
            setCurrentIndex(0);
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

            try {
                const data = isTheoryMode
                    ? await dbService.getQuestionsByGroup(testId, langId)
                    : await dbService.getQuestionsByTest(testId, langId);

                if (!cancelled) {
                    setQuestions(data);

                    const questionIds = data.map((q) => q.id);
                    const favoriteIds = await dbService.getFavoriteQuestionIds(questionIds);

                    if (!cancelled) {
                        const byId = favoriteIds.reduce<Record<number, boolean>>((acc, qId) => {
                            acc[qId] = true;
                            return acc;
                        }, {});
                        setFavoriteQuestionIds(byId);
                    }
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
    }, [isTheoryMode, langId, testId]);

    useEffect(() => {
        const activeDot = document.getElementById(`theory-dot-${currentIndex}`);
        activeDot?.scrollIntoView({block: 'nearest', inline: 'center', behavior: 'smooth'});
    }, [currentIndex]);

    useEffect(() => {
        scrollBodyRef.current?.scrollTo({top: 0, behavior: 'smooth'});
    }, [currentIndex]);

    const currentQuestion = questions[currentIndex];
    const currentAnswer = currentQuestion ? answersByQuestionId[currentQuestion.id] : undefined;
    const draftSelectedAnswerId = currentQuestion ? draftAnswersByQuestionId[currentQuestion.id] ?? null : null;
    const selectedAnswerId = draftSelectedAnswerId ?? currentAnswer?.answerId ?? null;
    const isAnswered = Boolean(currentAnswer);
    const hasDraftSelection = selectedAnswerId !== null;
    const isCurrentFavorite = currentQuestion ? Boolean(favoriteQuestionIds[currentQuestion.id]) : false;
    const currentQuestionImageSrc = useMemo(() => resolveLocalQuestionImage(currentQuestion?.image), [currentQuestion?.image]);

    const score = useMemo(
        () => Object.values(answersByQuestionId).filter((answer) => answer.isRight).length,
        [answersByQuestionId],
    );

    const passThreshold = useMemo(() => {
        if (questions.length <= 0) return 0;
        return Math.max(questions.length - 2, 1);
    }, [questions.length]);

    const isPassed = score >= passThreshold;
    const wrongCount = Math.max(questions.length - score, 0);

    const theoryResult = useMemo(() => {
        const total = Math.max(questions.length, 1);
        const percent = Math.round((score / total) * 100);

        if (percent >= 85) {
            return {text: 'Գերազանց արդյունք', tone: 'good' as const, image: goodImage};
        }
        if (percent >= 65) {
            return {text: 'Լավ արդյունք', tone: 'good' as const, image: notBadImage};
        }
        if (percent >= 45) {
            return {text: 'Վատ չէ, բայց դեռ աշխատելու տեղ կա', tone: 'mid' as const, image: lilBadImage};
        }

        return {text: 'Կա աշխատելու տեղ', tone: 'bad' as const, image: badImage};
    }, [questions.length, score]);

    const theoryAnswerAnalysis = useMemo(() => {
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
    }, [wrongCount]);

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

    const shouldRevealAnswerFeedback = isTheoryMode ? isAnswered : examReviewMode;
    const canGoNext = hasDraftSelection || isAnswered || (!isTheoryMode && examReviewMode);

    const goToQuestion = (index: number) => {
        if (index < 0 || index >= questions.length) return;
        setCurrentIndex(index);
    };

    const handleAnswer = (answerId: number) => {
        if (!currentQuestion) return;

        const questionId = currentQuestion.id;
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

    const commitCurrentAnswer = async () => {
        if (!currentQuestion) return true;

        const questionId = currentQuestion.id;
        const committedAnswer = answersByQuestionId[questionId];
        const draftAnswerId = draftAnswersByQuestionId[questionId];

        if (committedAnswer && (draftAnswerId === undefined || draftAnswerId === committedAnswer.answerId)) {
            if (draftAnswerId === committedAnswer.answerId) {
                setDraftAnswersByQuestionId((prev) => {
                    const next = {...prev};
                    delete next[questionId];
                    return next;
                });
            }
            return true;
        }

        if (draftAnswerId === undefined) {
            return false;
        }

        const selectedAnswer = currentQuestion.answers.find((answer) => answer.id === draftAnswerId);
        if (!selectedAnswer) {
            return false;
        }

        const isRight = selectedAnswer.is_right;

        setAnswersByQuestionId((prev) => ({
            ...prev,
            [questionId]: {
                answerId: draftAnswerId,
                isRight,
            },
        }));

        setDraftAnswersByQuestionId((prev) => {
            const next = {...prev};
            delete next[questionId];
            return next;
        });

        try {
            if (isTheoryMode) {
                await dbService.saveUserAnswer(questionId, draftAnswerId, currentQuestion.group_id, isRight);
            }
        } catch (err) {
            console.error('Failed to save answer', err);
        }

        return true;
    };

    const finalizeExamIfNeeded = async (elapsedSeconds: number) => {
        if (isTheoryMode || completionSavedRef.current) {
            return;
        }

        completionSavedRef.current = true;

        try {
            await dbService.recordExamTestCompletion(testId, score, questions.length, elapsedSeconds);
        } catch (err) {
            console.error('Failed to save exam completion', err);
        }
    };

    const finishExam = async (timedOut = false) => {
        if (isTheoryMode || examFinalizedRef.current) {
            return;
        }

        examFinalizedRef.current = true;

        const elapsedSeconds = Math.min(
            Math.round((Date.now() - startedAtRef.current) / 1000),
            EXAM_DURATION_SECONDS,
        );

        setResultDurationSec(elapsedSeconds);
        setExamTimeLeftSec(Math.max(EXAM_DURATION_SECONDS - elapsedSeconds, 0));
        setExamTimedOut(timedOut);
        setExamReviewMode(true);
        await finalizeExamIfNeeded(elapsedSeconds);
        setShowResult(true);
    };

    useEffect(() => {
        if (isTheoryMode || loading || showResult || examReviewMode || questions.length === 0) {
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
    }, [examReviewMode, isTheoryMode, loading, questions.length, showResult]);

    useEffect(() => {
        if (isTheoryMode || loading || showResult || examReviewMode || questions.length === 0) {
            return;
        }

        if (examTimeLeftSec <= 0) {
            void finishExam(true);
        }
    }, [examReviewMode, examTimeLeftSec, isTheoryMode, loading, questions.length, showResult]);

    const handleNext = async () => {
        if (!isTheoryMode && examReviewMode) {
            if (currentIndex < questions.length - 1) {
                goToQuestion(currentIndex + 1);
            } else {
                history.push('/tests');
            }
            return;
        }

        const committed = await commitCurrentAnswer();
        if (!committed) {
            return;
        }

        if (currentIndex < questions.length - 1) {
            goToQuestion(currentIndex + 1);
            return;
        }

        if (!isTheoryMode) {
            await finishExam(false);
            return;
        }

        setResultDurationSec(Math.round((Date.now() - startedAtRef.current) / 1000));
        setShowResult(true);
    };

    const handleClose = () => {
        if (isTheoryMode) {
            history.push('/theory-tests');
            return;
        }

        setShowExitConfirm(true);
    };

    const handleExitConfirm = () => {
        setShowExitConfirm(false);
        history.push('/tests');
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
        const text = `${theoryResult.text}\n${score} / ${questions.length} հարց\nԺամանակ՝ ${formattedResultDuration}`;

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

    if (!questions.length) {
        return (
            <IonPage>
                <IonHeader className="ion-no-border">
                    <IonToolbar>
                        <IonButtons slot="start">
                            <IonBackButton defaultHref={backHref}/>
                        </IonButtons>
                        <IonTitle>{isTheoryMode ? t('theory_topics') : t('exam_tests')}</IonTitle>
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
        if (isTheoryMode) {
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
                                <h2 className={`theory-result-status is-${theoryResult.tone}`}>{theoryResult.text}</h2>
                                <p className="theory-result-analysis">{theoryAnswerAnalysis}</p>

                                <div className="theory-result-illustration-box">
                                    <img src={theoryResult.image} alt="result" className="theory-result-illustration"/>
                                </div>

                                <div className="theory-result-meta-row">
                                    <div className="theory-result-meta-item">
                                        <IonIcon icon={checkmarkCircleOutline}/>
                                        <span>
                      {score} / {questions.length} հարց
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
            <IonPage>
                <IonHeader className="ion-no-border">
                    <IonToolbar>
                        <IonTitle>{t('result')}</IonTitle>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="ion-padding">
                    <div style={{textAlign: 'center', marginTop: '72px'}}>
                        <h2 style={{margin: 0, color: '#334155'}}>{t('correct_answers')}</h2>

                        <p style={{fontSize: '36px', fontWeight: 800, color: '#0ea5e9', margin: '8px 0 0'}}>
                            {score} / {questions.length}
                        </p>

                        {!isTheoryMode && (
                            <>
                                <p style={{
                                    marginTop: '14px',
                                    fontWeight: 700,
                                    color: isPassed ? '#10b981' : '#ef4444'
                                }}>
                                    {isPassed ? t('exam_passed') : t('exam_failed')}
                                </p>

                                {examTimedOut && (
                                    <p style={{marginTop: '10px', fontWeight: 700, color: '#ef4444'}}>
                                        Ժամանակը ավարտվել է
                                    </p>
                                )}

                                <p style={{marginTop: '10px', color: '#64748b', fontWeight: 600}}>
                                    Ժամանակ՝ {formattedResultDuration}
                                </p>
                            </>
                        )}

                        <IonButton
                            expand="block"
                            fill="clear"
                            className="theory-flat-action-btn"
                            onClick={openExamAnswers}
                            style={{marginTop: '18px'}}
                        >
                            <IonIcon slot="start" icon={documentTextOutline}/>
                            Իմ պատասխանները
                        </IonButton>

                        <IonButton expand="block" routerLink={backHref} style={{marginTop: '12px'}}>
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
                            <h1 className="theory-detail-title">
                                {isTheoryMode
                                    ? `Թեմա ${testId}: Հարց #${currentIndex + 1}`
                                    : `Թեստ ${testId}: Հարց #${currentIndex + 1}`}
                            </h1>

                            {!isTheoryMode && !examReviewMode && (
                                <div className={`theory-exam-timer${examTimeLeftSec <= 5 * 60 ? ' is-danger' : ''}`}>
                                    <IonIcon icon={timeOutline}/>
                                    <span>{formattedExamTimeLeft}</span>
                                </div>
                            )}
                        </div>
                        <div className="theory-dots-row">
                            {questions.map((question, index) => {
                                const answered = Boolean(answersByQuestionId[question.id]);
                                const isRight = answersByQuestionId[question.id]?.isRight ?? null;
                                const isActive = index === currentIndex;

                                const colorClass =
                                    answered && (isTheoryMode || examReviewMode)
                                        ? isRight
                                            ? ' is-correct'
                                            : ' is-wrong'
                                        : '';

                                return (
                                    <button
                                        key={question.id}
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
                                const answerDisabled = examReviewMode;

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

                        <div className="theory-actions-row">
                            <div className="theory-footer-row">
                                {canGoNext ? (
                                    <IonButton expand="block" className="theory-next-btn" onClick={handleNext}>
                                        {currentIndex === questions.length - 1 ? t('finish') : 'Հաջորդ հարց'}
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
                buttons={[
                    {
                        text: t('no'),
                        role: 'cancel',
                        handler: handleExitCancel,
                    },
                    {
                        text: t('yes'),
                        role: 'destructive',
                        handler: handleExitConfirm,
                    },
                ]}
                onDidDismiss={handleExitCancel}
            />
        </IonPage>
    );
};

export default TestDetail;
