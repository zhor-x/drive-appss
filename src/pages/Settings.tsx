import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dbService } from '../services/DatabaseService';
import './Settings.css';

const Settings: React.FC = () => {
  const { t } = useLanguage();
  const [presentToast] = useIonToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearStatistics = async () => {
    if (clearing) {
      return;
    }

    setClearing(true);
    setShowClearConfirm(false);

    try {
      await dbService.clearUserStatistics();
      await presentToast({
        message: t('statistics_cleared'),
        duration: 1800,
        position: 'bottom',
        color: 'success',
      });
    } catch (error) {
      console.error('Failed to clear statistics', error);
      await presentToast({
        message: 'Չհաջողվեց մաքրել վիճակագրությունը',
        duration: 2200,
        position: 'bottom',
        color: 'danger',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <IonPage className="settings-page">
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>{t('settings')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding settings-content">
        <div className="settings-intro">
          {t('data_management')}
        </div>

        <IonList inset className="settings-list">
          <IonItem lines="none">
            <IonLabel>
              <h2>{t('clear_statistics')}</h2>
              <p>{t('clear_statistics_description')}</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonButton
          expand="block"
          color="danger"
          className="settings-danger-button"
          onClick={() => setShowClearConfirm(true)}
          disabled={clearing}
        >
          {clearing ? <IonSpinner name="crescent" /> : t('clear_statistics')}
        </IonButton>
      </IonContent>

      <IonAlert
        isOpen={showClearConfirm}
        header={t('clear_statistics_title')}
        message={t('clear_statistics_message')}
        cssClass="app-alert"
        buttons={[
          {
            text: t('cancel'),
            role: 'cancel',
            cssClass: 'app-alert-cancel',
            handler: () => setShowClearConfirm(false),
          },
          {
            text: t('yes'),
            role: 'destructive',
            cssClass: 'app-alert-danger',
            handler: () => {
              void handleClearStatistics();
            },
          },
        ]}
        onDidDismiss={() => setShowClearConfirm(false)}
      />
    </IonPage>
  );
};

export default Settings;
