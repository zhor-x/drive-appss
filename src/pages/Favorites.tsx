import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useIonViewWillEnter } from '@ionic/react';
import { closeOutline, imageOutline, searchOutline, star, starOutline } from 'ionicons/icons';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { dbService, FavoriteQuestionItem, QuestionItem } from '../services/DatabaseService';
import './Favorites.css';

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

const Favorites: React.FC = () => {
  const history = useHistory();
  const { t, langId } = useLanguage();

  const [items, setItems] = useState<FavoriteQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<{ answerId: number; isRight: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await dbService.getFavoriteQuestions(langId);
      setItems(rows);
    } catch (e) {
      console.error('Failed to load favorites', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [langId]);

  useIonViewWillEnter(() => {
    load();
  });

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      return title.includes(term) || String(item.id).includes(term);
    });
  }, [items, search]);

  const previewImageSrc = useMemo(
    () => resolveLocalQuestionImage(previewQuestion?.image),
    [previewQuestion?.image],
  );

  const openPreview = async (questionId: number) => {
    setPreviewLoading(true);
    setPreviewQuestion(null);
    setPreviewAnswer(null);

    try {
      const rows = await dbService.getQuestionsByIds([questionId], langId);
      setPreviewQuestion(rows[0] ?? null);
    } catch (error) {
      console.error('Failed to open favorite question preview', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewQuestion(null);
    setPreviewLoading(false);
    setPreviewAnswer(null);
  };

  const handlePreviewAnswer = (answerId: number, isRight: boolean) => {
    if (previewAnswer) {
      return;
    }

    setPreviewAnswer({ answerId, isRight });
  };

  const removeFavorite = async (questionId: number) => {
    if (removingId === questionId) return;
    setRemovingId(questionId);

    try {
      const existsAfterToggle = await dbService.toggleFavoriteQuestion(questionId);
      if (existsAfterToggle) {
        await dbService.toggleFavoriteQuestion(questionId);
      }

      setItems((prev) => prev.filter((item) => item.id !== questionId));

      if (previewQuestion?.id === questionId) {
        closePreview();
      }
    } catch (error) {
      console.error('Failed to remove favorite question', error);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <IonPage className="favorites-page">
      <IonHeader translucent className="favorites-header ion-no-border">
        <IonToolbar className="favorites-toolbar">
          <IonTitle className="favorites-title-sm">{t('favorites')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="favorites-content">
        <IonHeader collapse="condense" className="favorites-header-condense ion-no-border">
          <IonToolbar className="favorites-toolbar-lg">
            <IonTitle size="large" className="favorites-title-lg">
              {t('favorites')}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        {loading ? (
          <div className="favorites-loader">
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : (
          <div className="favorites-wrap">
            <div className="favorites-summary-card">
              <div className="favorites-summary-head">
                <div className="favorites-summary-title">{t('favorites_total')}</div>
                <div className="favorites-summary-count">{items.length}</div>
              </div>
              <div className="favorites-summary-sub">{t('saved_questions')}</div>
            </div>

            {items.length > 0 && (
              <label className="favorites-search">
                <IonIcon icon={searchOutline} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('favorites_search')}
                />
              </label>
            )}

            {items.length === 0 ? (
              <div className="favorites-empty-card">
                <IonIcon icon={starOutline} className="favorites-empty-icon" />
                <h3>{t('no_favorites')}</h3>
                <p>{t('favorites_empty_hint')}</p>
                <IonButton className="favorites-empty-action" onClick={() => history.push('/tests')}>
                  {t('exam_tests')}
                </IonButton>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="favorites-empty-card">
                <IonIcon icon={searchOutline} className="favorites-empty-icon" />
                <h3>{t('no_favorites_found')}</h3>
              </div>
            ) : (
              <div className="favorites-list">
                {filteredItems.map((item) => {
                  const thumbSrc = resolveLocalQuestionImage(item.image);

                  return (
                    <article key={item.id} className="favorite-card">
                      <button type="button" className="favorite-open-area" onClick={() => openPreview(item.id)}>
                        <div className="favorite-thumb">
                          {thumbSrc ? (
                            <img src={thumbSrc} alt={`favorite-${item.id}`} />
                          ) : (
                            <IonIcon icon={imageOutline} />
                          )}
                        </div>

                        <div className="favorite-body">
                          <div className="favorite-id">#{item.id}</div>
                          <h3>{item.title || `${t('question')} #${item.id}`}</h3>
                          <span className="favorite-open-link">{t('open_question')}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="favorite-remove-btn"
                        onClick={() => removeFavorite(item.id)}
                        disabled={removingId === item.id}
                        aria-label={t('remove_favorite')}
                      >
                        {removingId === item.id ? <IonSpinner name="lines-small" /> : <IonIcon icon={star} />}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </IonContent>

      <IonModal
        isOpen={previewLoading || Boolean(previewQuestion)}
        onDidDismiss={closePreview}
        className="favorites-preview-modal"
      >
        <IonContent className="favorites-preview-content">
          <div className="favorites-preview-wrap">
            <div className="favorites-preview-head">
              <div className="favorites-preview-title">{previewQuestion ? `${t('question')} #${previewQuestion.id}` : t('open_question')}</div>
              <button type="button" className="favorites-preview-close" onClick={closePreview}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            {previewLoading ? (
              <div className="favorites-loader">
                <IonSpinner name="crescent" color="primary" />
              </div>
            ) : previewQuestion ? (
              <>
                {previewImageSrc && (
                  <div className="favorites-preview-image-wrap">
                    <img src={previewImageSrc} alt="question" className="favorites-preview-image" />
                  </div>
                )}

                <h2 className="favorites-preview-question">{previewQuestion.title}</h2>

                <div className="favorites-preview-answers">
                  {previewQuestion.answers.map((answer, index) => (
                    <button
                      key={answer.id}
                      type="button"
                      className={`favorites-preview-answer${previewAnswer && answer.is_right ? ' is-right' : ''}${previewAnswer && previewAnswer.answerId === answer.id && !answer.is_right ? ' is-wrong' : ''}`}
                      onClick={() => handlePreviewAnswer(answer.id, answer.is_right)}
                      disabled={Boolean(previewAnswer)}
                    >
                      <span className="favorites-preview-answer-number">{index + 1}.</span>
                      <span className="favorites-preview-answer-text">{answer.title}</span>
                    </button>
                  ))}
                </div>

                <IonButton
                  expand="block"
                  fill="outline"
                  className="favorites-remove-action"
                  onClick={() => removeFavorite(previewQuestion.id)}
                >
                  {t('remove_favorite')}
                </IonButton>
              </>
            ) : (
              <div className="favorites-empty-card">
                <h3>{t('no_questions')}</h3>
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Favorites;
