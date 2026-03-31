import {
  IonProgressBar,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useIonViewDidEnter, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { chevronBackOutline } from 'ionicons/icons';
import React, { useCallback, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, TheoryTopicItem } from '../services/DatabaseService';
import './TheoryTests.css';

type IonBackButtonEvent = CustomEvent<{
  register: (priority: number, handler: () => void | Promise<void>) => void;
}>;

const HARDWARE_BACK_PRIORITY = 1000;

const TheoryTests: React.FC = () => {
  const history = useHistory();
  const { langId, t } = useLanguage();
  const [items, setItems] = useState<TheoryTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);
  const backButtonListenerRef = useRef<((event: IonBackButtonEvent) => void) | null>(null);

  const load = useCallback(async () => {
    if (loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setLoading(true);
    try {
      const data = await dbService.getTheoryTopics(langId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load theory topics', err);
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [langId]);

  useIonViewWillEnter(() => {
    load();
  });

  const attachBackButtonListener = useCallback(() => {
    if (Capacitor.getPlatform() !== 'android' || backButtonListenerRef.current || typeof document === 'undefined') {
      return;
    }

    const listener = (event: IonBackButtonEvent) => {
      event.detail.register(HARDWARE_BACK_PRIORITY, () => {
        history.replace('/home');
      });
    };

    document.addEventListener('ionBackButton', listener as EventListener);
    backButtonListenerRef.current = listener;
  }, [history]);

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

  const handleBack = () => {
    history.replace('/home');
  };

  return (
    <IonPage className="theory-page">
      <IonHeader translucent className="theory-header ion-no-border">
        <IonToolbar className="theory-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" className="theory-back-btn" onClick={handleBack}>
              <IonIcon icon={chevronBackOutline} className="theory-back-icon" />
              <span>Հետ</span>
            </IonButton>
          </IonButtons>

          <IonTitle className="theory-title-sm">{t('training_by_topics')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="theory-content">
        <IonHeader collapse="condense" className="theory-header-condense ion-no-border">
          <IonToolbar className="theory-toolbar-lg">
            <IonTitle size="large" className="theory-title-lg">
              {t('training_by_topics')}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        {loading ? (
          <div className="theory-loader">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="theory-list-wrap">
            <IonList className="theory-list">
              {items.map((topic) => (
                <IonItem
                  key={topic.id}
                  button
                  detail={false}
                  routerLink={`/theory-tests/${topic.id}`}
                  className="theory-item"
                >

                  <IonLabel>
                    <h2 className="text-blue">№ {topic.id}</h2>
                    <h2>{topic.description || `${t('category_test')} ${topic.id}`}</h2>
                    <p className="theory-item-progress-text">
                      Լուծված է {topic.solved_count} / {topic.question_count} հարց
                    </p>

                    <IonProgressBar
                      value={topic.question_count > 0 ? topic.solved_count / topic.question_count : 0}
                      className="theory-progress"
                    />

                  </IonLabel>


                </IonItem>
              ))}
            </IonList>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default TheoryTests;
