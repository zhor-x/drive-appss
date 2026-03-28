import {
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonButton,
  IonButtons,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  carSportOutline,
  layersOutline,
  settingsOutline,
  sparklesOutline,
  starOutline,
} from 'ionicons/icons';
import { useIonViewWillEnter } from '@ionic/react';
import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, StatsSummary } from '../services/DatabaseService';
import './Home.css';

const initialStats: StatsSummary = {
  answered: 0,
  total: 0,
  errors: 0,
  readiness: 0,
  ticketsDone: 0,
  ticketsTotal: 0,
};

const Home: React.FC = () => {
  const history = useHistory();
  const { t } = useLanguage();
  const [stats, setStats] = useState<StatsSummary>(initialStats);
  const [loading, setLoading] = useState(true);
  const [randomLoading, setRandomLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => {
    loadStats();
  });

  const openRandomExam = useCallback(async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const testId = await dbService.getRandomExamTestId();
      if (testId) {
        history.push(`/tests/${testId}`);
      } else {
        history.push('/tests');
      }
    } finally {
      setRandomLoading(false);
    }
  }, [history, randomLoading]);

  return (
    <IonPage className="home-page">
      <IonHeader translucent className="home-header ion-no-border">
        <IonToolbar className="home-toolbar">
          <IonTitle className="home-title-sm">{t('account')}</IonTitle>
          <IonButtons slot="end">
            <IonButton className="home-settings-btn" fill="clear" onClick={() => history.push('/settings')} aria-label={t('settings')}>
              <IonIcon icon={settingsOutline} className="hero-settings-icon" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense" className="home-header-condense ion-no-border">
          <IonToolbar className="home-toolbar-lg">
            <IonTitle size="large" className="home-title-lg">{t('account')}</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="home-container">
          <IonCard className="stats-card">
            <IonCardContent>
              <h2 className="stats-title">{t('statistics')}</h2>

              {loading ? (
                <div className="centered-loader">
                  <IonSpinner name="crescent" color="primary" />
                </div>
              ) : (
                <>
                  <div className="stats-row">
                    <span>{t('questions_stat')}</span>
                    <strong>{stats.answered} {t('of')} {stats.total}</strong>
                  </div>
                  <IonProgressBar value={stats.total > 0 ? stats.answered / stats.total : 0} className="progress-main" />

                  <div className="stats-split-row">
                    <div className="stats-split-item">
                      <div className="stats-split-head">
                        <span>{t('tickets_stat')}</span>
                        <strong>{stats.ticketsDone} {t('of')} {stats.ticketsTotal}</strong>
                      </div>
                      <IonProgressBar
                        value={stats.ticketsTotal > 0 ? stats.ticketsDone / stats.ticketsTotal : 0}
                        className="progress-secondary"
                      />
                    </div>
                    <div className="stats-split-item">
                      <div className="stats-split-head">
                        <span>{t('readiness')}</span>
                        <strong>{stats.readiness}%</strong>
                      </div>
                      <IonProgressBar value={stats.readiness / 100} className="progress-readiness" />
                    </div>
                  </div>

                  <div className="quick-actions">
                    <button className="quick-action" onClick={() => history.push('/errors')}>
                      <div className="quick-action-top">
                        <div className="quick-action-value">{stats.errors}</div>
                      </div>
                      <div className="quick-action-label">{t('my_errors')}</div>
                    </button>

                    <button className="quick-action" onClick={openRandomExam}>
                      <div className="quick-action-top">
                        {randomLoading ? (
                          <IonSpinner name="crescent" />
                        ) : (
                          <IonIcon icon={carSportOutline} className="quick-action-icon quick-action-icon-car" />
                        )}
                      </div>
                      <div className="quick-action-label">{t('start_exam')}</div>
                    </button>
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>

          <div className="home-links-grid">
            <button className="home-link-card home-link-card-smart" onClick={() => history.push('/smart-training')}>
              <IonIcon icon={sparklesOutline} className="home-link-icon home-link-icon-smart" />
              <h3>{t('smart_training')}</h3>
              <p>{t('smart_training_hint')}</p>
            </button>

            <button className="home-link-card" onClick={() => history.push('/theory-tests')}>
              <IonIcon icon={layersOutline} className="home-link-icon home-link-icon-pink" />
              <h3>{t('training_by_topics')}</h3>
              <p>{t('theory_topics')}</p>
            </button>

            <button className="home-link-card" onClick={() => history.push('/favorites')}>
              <IonIcon icon={starOutline} className="home-link-icon home-link-icon-yellow" />
              <h3>{t('favorites')}</h3>
              <p>{t('saved_questions')}</p>
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
