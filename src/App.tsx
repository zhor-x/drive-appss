import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { personOutline, clipboardOutline, bookOutline, warningOutline } from 'ionicons/icons';
import Home from './pages/Home';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import React, { Suspense, lazy, useEffect } from 'react';
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
const TestsPage = lazy(() => import('./pages/Tests'));
const RulesPage = lazy(() => import('./pages/Rules'));
const SignsPage = lazy(() => import('./pages/Signs'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const FavoritesPage = lazy(() => import('./pages/Favorites'));
const SmartTrainingPage = lazy(() => import('./pages/SmartTraining'));
const WrongQuestionsPage = lazy(() => import('./pages/WrongQuestions'));
const ExamPage = lazy(() => import('./pages/Exam'));
const TheoryTestsPage = lazy(() => import('./pages/TheoryTests'));
const TestDetailPage = lazy(() => import('./pages/TestDetail'));

const RouteLoader: React.FC = () => (
  <IonPage>
    <IonContent className="ion-padding">
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px' }}>
        <IonSpinner name="crescent" color="primary" />
      </div>
    </IonContent>
  </IonPage>
);

const withRouteSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<RouteLoader />}>
    {node}
  </Suspense>
);

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
        <Route exact path="/tests">{withRouteSuspense(<TestsPage />)}</Route>
        <Route exact path="/tests/:id">{withRouteSuspense(<TestDetailPage />)}</Route>
        <Route exact path="/theory-tests">{withRouteSuspense(<TheoryTestsPage />)}</Route>
        <Route exact path="/theory-tests/:id">{withRouteSuspense(<TestDetailPage />)}</Route>
        <Route exact path="/smart-training">{withRouteSuspense(<SmartTrainingPage />)}</Route>
        <Route exact path="/favorites">{withRouteSuspense(<FavoritesPage />)}</Route>
        <Route exact path="/exam">{withRouteSuspense(<ExamPage />)}</Route>
        <Route exact path="/errors">{withRouteSuspense(<WrongQuestionsPage />)}</Route>
        <Route exact path="/rules">{withRouteSuspense(<RulesPage />)}</Route>
        <Route exact path="/signs">{withRouteSuspense(<SignsPage />)}</Route>
        <Route exact path="/settings">{withRouteSuspense(<SettingsPage />)}</Route>
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
