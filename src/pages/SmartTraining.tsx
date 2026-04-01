import {
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
import { useIonViewWillEnter } from '@ionic/react';
import { chevronBackOutline, sparklesOutline } from 'ionicons/icons';
import React, { useCallback, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, SmartTrainingFocusItem } from '../services/DatabaseService';
import './SmartTraining.css';

const SmartTraining: React.FC = () => {
  const history = useHistory();
  const { langId, t } = useLanguage();
  const [items, setItems] = useState<SmartTrainingFocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setLoading(true);
    try {
      const data = await dbService.getSmartTrainingFocuses(langId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load smart training focuses', err);
      setItems([]);
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [langId]);

  useIonViewWillEnter(() => {
    load();
  });

  const handleBack = () => {
    history.replace('/home');
  };

  const openFocus = (focusId: string) => {
    history.push(`/smart-training/${encodeURIComponent(focusId)}`);
  };

  const getReasonLabel = (focus: SmartTrainingFocusItem) => {
    return focus.recommendation_reason === 'weak'
      ? t('smart_training_reason_weak')
      : t('smart_training_reason_incomplete');
  };

  const featuredTopic = items[0] ?? null;
  const restTopics = items.slice(1);

  return (
    <IonPage className="smart-page">
      <IonHeader translucent className="smart-header ion-no-border">
        <IonToolbar className="smart-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" className="smart-back-btn" onClick={handleBack}>
              <IonIcon icon={chevronBackOutline} className="smart-back-icon" />
              <span>{t('previous')}</span>
            </IonButton>
          </IonButtons>

          <IonTitle className="smart-title-sm">{t('smart_training')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="smart-content">
        <IonHeader collapse="condense" className="smart-header-condense ion-no-border">
          <IonToolbar className="smart-toolbar-lg">
            <IonTitle size="large" className="smart-title-lg">
              {t('smart_training')}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        {loading ? (
          <div className="smart-loader">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : !featuredTopic ? (
          <div className="smart-wrap">
            <div className="smart-empty-card">
              <IonIcon icon={sparklesOutline} className="smart-empty-icon" />
              <h2>{t('smart_training_empty')}</h2>
              <p>{t('smart_training_empty_hint')}</p>
              <IonButton expand="block" className="smart-empty-action" onClick={() => history.push('/theory-tests')}>
                {t('training_by_topics')}
              </IonButton>
            </div>
          </div>
        ) : (
          <div className="smart-wrap">
            <section className="smart-hero-card">
              <div className="smart-hero-eyebrow">{t('smart_training_primary')}</div>
              <h2>{featuredTopic.title}</h2>
              <p>{featuredTopic.description}</p>

              <div className="smart-hero-chips">
                <span className={`smart-reason-chip${featuredTopic.recommendation_reason === 'weak' ? ' is-weak' : ''}`}>
                  {getReasonLabel(featuredTopic)}
                </span>
                <span className="smart-stat-chip">
                  {t('wrong_answers_stat')}: {featuredTopic.wrong_count}
                </span>
                <span className="smart-stat-chip">
                  {t('accuracy_stat')}: {featuredTopic.accuracy}%
                </span>
                <span className="smart-stat-chip">
                  {t('answered_progress')}: {featuredTopic.answered_count}/{featuredTopic.question_count}
                </span>
              </div>

              <IonButton expand="block" className="smart-hero-button" onClick={() => openFocus(featuredTopic.id)}>
                {t('smart_training_start')}
              </IonButton>
            </section>

            {restTopics.length > 0 && (
              <div className="smart-list">
                {restTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    className="smart-topic-card"
                    onClick={() => openFocus(topic.id)}
                  >
                    <div className="smart-topic-head">
                      <div>
                        <h3>{topic.title}</h3>
                        <p className="smart-topic-description">{topic.description}</p>
                      </div>
                      <span className={`smart-reason-chip${topic.recommendation_reason === 'weak' ? ' is-weak' : ''}`}>
                        {getReasonLabel(topic)}
                      </span>
                    </div>

                    <div className="smart-topic-stats">
                      <span>{t('wrong_answers_stat')}: {topic.wrong_count}</span>
                      <span>{t('accuracy_stat')}: {topic.accuracy}%</span>
                      <span>{t('answered_progress')}: {topic.answered_count}/{topic.question_count}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SmartTraining;
