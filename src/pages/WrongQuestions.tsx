import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { useIonViewWillEnter } from '@ionic/react';
import { closeOutline, star, starOutline } from 'ionicons/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, WrongQuestionItem } from '../services/DatabaseService';
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

const WrongQuestions: React.FC = () => {
  const history = useHistory();
  const { langId, t } = useLanguage();

  const [questions, setQuestions] = useState<WrongQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<number, AnswerState>>({});
  const [favoriteQuestionIds, setFavoriteQuestionIds] = useState<Record<number, boolean>>({});

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setCurrentIndex(0);
    setAnswersByQuestionId({});
    setFavoriteQuestionIds({});

    try {
      const data = await dbService.getWrongQuestions(langId);
      setQuestions(data);

      const questionIds = data.map((q) => q.id);
      if (questionIds.length) {
        const favoriteIds = await dbService.getFavoriteQuestionIds(questionIds);
        const byId = favoriteIds.reduce<Record<number, boolean>>((acc, qId) => {
          acc[qId] = true;
          return acc;
        }, {});
        setFavoriteQuestionIds(byId);
      }
    } catch (err) {
      console.error('Failed to load wrong questions', err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [langId]);

  useIonViewWillEnter(() => {
    loadData();
  });

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answersByQuestionId[currentQuestion.id] : undefined;
  const selectedAnswerId = currentAnswer?.answerId ?? null;
  const isAnswered = Boolean(currentAnswer);
  const isCurrentFavorite = currentQuestion ? Boolean(favoriteQuestionIds[currentQuestion.id]) : false;
  const currentQuestionImageSrc = useMemo(() => resolveLocalQuestionImage(currentQuestion?.image), [currentQuestion?.image]);

  useEffect(() => {
    const activeDot = document.getElementById(`theory-dot-${currentIndex}`);
    activeDot?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [currentIndex]);

  const handleClose = () => {
    history.push('/home');
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
  };

  const handleAnswer = async (answerId: number, isRight: boolean) => {
    if (!currentQuestion || answersByQuestionId[currentQuestion.id]) {
      return;
    }

    setAnswersByQuestionId((prev) => ({
      ...prev,
      [currentQuestion.id]: { answerId, isRight },
    }));

    try {
      await dbService.saveUserAnswer(currentQuestion.id, answerId, currentQuestion.group_id, isRight);
    } catch (err) {
      console.error('Failed to save retry answer', err);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
      return;
    }

    // No result screen for /errors: reload list.
    // If all answers became correct, getWrongQuestions() returns [] and page shows empty state.
    await loadData();
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
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px' }}>
            <IonSpinner name="crescent" color="primary" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!questions.length) {
    return (
      <IonPage className="theory-detail-page">
        <IonContent fullscreen className="theory-detail-content">
          <div className="theory-result-wrap">
            <button type="button" className="theory-close-btn" onClick={handleClose}>
              <IonIcon icon={closeOutline} />
            </button>

            <h1 className="theory-result-header-title">{t('my_errors')}</h1>

            <div className="theory-result-card" style={{ textAlign: 'center' }}>
              <h2 className="theory-result-status is-good">{t('no_wrong_answers')}</h2>
              <p className="theory-result-analysis">{t('continue_training')}</p>
            </div>

            <IonButton expand="block" className="theory-share-btn" onClick={() => history.push('/tests')}>
              {t('exam_tests')}
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="theory-detail-page">
      <IonContent fullscreen className="theory-detail-content">
        <div className="theory-detail-wrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button type="button" className="theory-close-btn" onClick={handleClose}>
            <IonIcon icon={closeOutline} />
          </button>

          <h1 className="theory-detail-title">{t('my_errors')}: Հարց #{currentIndex + 1}</h1>

          <div className="theory-dots-row">
            {questions.map((question, index) => {
              const answered = Boolean(answersByQuestionId[question.id]);
              const isRight = answersByQuestionId[question.id]?.isRight ?? null;
              const isActive = index === currentIndex;
              const colorClass = answered ? (isRight ? ' is-correct' : ' is-wrong') : '';

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

          {currentQuestionImageSrc && (
            <div className="theory-image-wrap">
              <img src={currentQuestionImageSrc} alt="question" className="theory-image" />
            </div>
          )}

          <h2 className="theory-question-text">{currentQuestion?.title}</h2>

          <div className="theory-answer-list">
            {currentQuestion?.answers.map((answer, index) => {
              const isSelected = selectedAnswerId === answer.id;
              const showRight = isAnswered && answer.is_right;
              const showWrong = isAnswered && isSelected && !answer.is_right;

              return (
                <button
                  key={answer.id}
                  type="button"
                  className={`theory-answer-btn${showRight ? ' is-right' : ''}${showWrong ? ' is-wrong' : ''}`}
                  onClick={() => handleAnswer(answer.id, answer.is_right)}
                  disabled={isAnswered}
                >
                  <span className="theory-answer-number">{index + 1}.</span>
                  <span className="theory-answer-text">{answer.title}</span>
                </button>
              );
            })}
          </div>

          <div className="theory-actions-row">
            <div className="theory-footer-row">
              {isAnswered ? (
                <IonButton expand="block" className="theory-next-btn" onClick={handleNext}>
                  {currentIndex === questions.length - 1 ? t('finish') : 'Հաջորդ հարց'}
                </IonButton>
              ) : (
                <div className="theory-footer-placeholder" />
              )}

              <button
                type="button"
                className={`theory-star-btn${isCurrentFavorite ? ' is-active' : ''}`}
                onClick={toggleCurrentFavorite}
              >
                <IonIcon icon={isCurrentFavorite ? star : starOutline} />
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default WrongQuestions;
