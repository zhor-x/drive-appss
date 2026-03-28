import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { personOutline, clipboardOutline, bookOutline, warningOutline } from 'ionicons/icons';
import Home from './pages/Home';
import Signs from './pages/Signs';
import Rules from './pages/Rules';
import Tests from './pages/Tests';
import Settings from './pages/Settings';
import TestDetail from './pages/TestDetail';
import Exam from './pages/Exam';
import WrongQuestions from './pages/WrongQuestions';
import TheoryTests from './pages/TheoryTests';
import SmartTraining from './pages/SmartTraining';
import Favorites from './pages/Favorites';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import React, { useEffect } from 'react';
import { dbService } from './services/DatabaseService';

/* Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';
import './App.css';

setupIonicReact();
const USE_DRIVEGO_PREVIEW_COLORS = true; // rollback: set to false

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const hideMainTabBar =
    location.pathname === '/theory-tests'
    || location.pathname.startsWith('/theory-tests/')
    || location.pathname === '/smart-training';
  
  useEffect(() => {
    dbService.init();
  }, []);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/home"><Home /></Route>
        <Route exact path="/tests"><Tests /></Route>
        <Route exact path="/tests/:id"><TestDetail /></Route>
        <Route exact path="/theory-tests"><TheoryTests /></Route>
        <Route exact path="/theory-tests/:id"><TestDetail /></Route>
        <Route exact path="/smart-training"><SmartTraining /></Route>
        <Route exact path="/favorites"><Favorites /></Route>
        <Route exact path="/exam"><Exam /></Route>
        <Route exact path="/errors"><WrongQuestions /></Route>
        <Route exact path="/rules"><Rules /></Route>
        <Route exact path="/signs"><Signs /></Route>
        <Route exact path="/settings"><Settings /></Route>
        <Route exact path="/profile"><Redirect to="/settings" /></Route>
        <Route exact path="/"><Redirect to="/home" /></Route>
      </IonRouterOutlet>
      
      {!hideMainTabBar && (
        <IonTabBar slot="bottom" className="main-tab-bar">
          <IonTabButton tab="home" href="/home" className="main-tab-btn">
            <IonIcon icon={personOutline} />
            <IonLabel>{t('profile')}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="tests" href="/tests" className="main-tab-btn">
            <IonIcon icon={clipboardOutline} />
            <IonLabel>{t('tests')}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="rules" href="/rules" className="main-tab-btn">
            <IonIcon icon={bookOutline} />
            <IonLabel>{t('rules_short')}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="signs" href="/signs" className="main-tab-btn">
            <IonIcon icon={warningOutline} />
            <IonLabel>{t('signs')}</IonLabel>
          </IonTabButton>
        </IonTabBar>
      )}
    </IonTabs>
  );
}

const App: React.FC = () => (
  <IonApp className={USE_DRIVEGO_PREVIEW_COLORS ? 'theme-drivego-preview' : undefined}>
    <LanguageProvider>
      <IonReactRouter>
        <AppContent />
      </IonReactRouter>
    </LanguageProvider>
  </IonApp>
);

export default App;
