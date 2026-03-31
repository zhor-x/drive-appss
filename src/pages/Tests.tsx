import {
  IonContent,
  IonHeader,
  IonPage,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useIonViewWillEnter } from '@ionic/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, ExamTestItem, LatestExamResultItem } from '../services/DatabaseService';
import { getResultPresentation } from '../utils/resultPresentation';
import './Tests.css';

const EXAM_SCORE_TOTAL = 20;

const Tests: React.FC = () => {
  const history = useHistory();
  const { langId, t } = useLanguage();
  const [items, setItems] = useState<ExamTestItem[]>([]);
  const [lastResult, setLastResult] = useState<LatestExamResultItem | null>(null);
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setLoading(true);
    try {
      const [testsData, latestResult] = await Promise.all([
        dbService.getExamTests(langId),
        dbService.getLatestCompletedExamResult(langId),
      ]);
      setItems(testsData);
      setLastResult(latestResult);
    } catch (err) {
      console.error('Failed to load exam tests', err);
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [langId]);

  useIonViewWillEnter(() => {
    load();
  });

  const normalized = useMemo(
    () =>
      items.map((test) => {
        const total = EXAM_SCORE_TOTAL;
        const solved = Math.max(Math.min(Number(test.solved_count || 0), total), 0);
        return {
          ...test,
          total,
          solved,
          progress: total > 0 ? solved / total : 0,
        };
      }),
    [items],
  );

  const lastResultPresentation = useMemo(() => {
    if (!lastResult) {
      return null;
    }

    const total = lastResult.total_questions > 0 ? lastResult.total_questions : EXAM_SCORE_TOTAL;
    return {
      ...getResultPresentation(lastResult.correct_answers, total),
      total,
    };
  }, [lastResult]);

  return (
    <IonPage className="tests-page">
      <IonHeader translucent className="tests-header ion-no-border">
        <IonToolbar className="tests-toolbar">
          <IonTitle className="tests-title-sm">{t('tests')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="tests-content">
        <IonHeader collapse="condense" className="tests-header-condense ion-no-border">
          <IonToolbar className="tests-toolbar-lg">
            <IonTitle size="large" className="tests-title-lg">
              {t('tests')}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        {loading ? (
          <div className="tests-loader">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="tests-grid-wrap">
            {lastResult && lastResultPresentation && (
              <div className="tests-last-result-card">
                <div className="tests-last-result-copy">
                  <div className="tests-last-result-eyebrow">Վերջին արդյունքը</div>
                  <h2 className={`tests-last-result-title is-${lastResultPresentation.tone}`}>
                    {lastResultPresentation.text}
                  </h2>
                  <p className="tests-last-result-subtitle">
                    {lastResult.title || `${t('category_test')} ${lastResult.test_id}`}
                  </p>
                  <div className="tests-last-result-score">
                    {lastResult.correct_answers} / {lastResultPresentation.total}
                  </div>
                </div>

                <div className="tests-last-result-image-wrap">
                  <img
                    src={lastResultPresentation.image}
                    alt="last result"
                    className="tests-last-result-image"
                  />
                </div>
              </div>
            )}

            <div className="tests-grid">
              {normalized.map((test) => (
                <button
                  type="button"
                  key={test.id}
                  className="test-ticket-card"
                  onClick={() => history.push(`/tests/${test.id}`)}
                >
                  <div className="test-ticket-number">№{test.id}</div>

                  <div className="test-ticket-score">
                    {test.solved} / {test.total}
                  </div>

                  <div className="test-ticket-caption">Վերջին թեստի արդյունք</div>

                  <IonProgressBar value={test.progress} className="test-ticket-progress" />
                </button>
              ))}
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Tests;
