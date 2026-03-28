import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { dbService } from '../services/DatabaseService';

const Exam: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    let cancelled = false;

    const openRandom = async () => {
      const randomId = await dbService.getRandomExamTestId();
      if (cancelled) return;

      if (randomId) {
        history.replace(`/tests/${randomId}`);
      } else {
        history.replace('/tests');
      }
    };

    openRandom();

    return () => {
      cancelled = true;
    };
  }, [history]);

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Exam;
