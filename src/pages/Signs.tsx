import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, closeOutline, imageOutline } from 'ionicons/icons';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dbService } from '../services/DatabaseService';
import './Signs.css';

type SignCategoryItem = {
  id: number;
  title: string;
};

type SignItem = {
  id: number;
  image: string | null;
  code: string;
  title: string;
  description: string | null;
};

const ROAD_SIGN_IMAGE_MAP = import.meta.glob('../assets/images/road-signs/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const ROAD_SIGN_IMAGE_BY_NAME = new Map<string, string>(
  Object.entries(ROAD_SIGN_IMAGE_MAP).map(([key, url]) => [key.split('/').pop() ?? '', url]),
);

const resolveSignImage = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const image = String(value).trim();
  if (!image) {
    return null;
  }

  const filename = image.split('/').pop()?.trim();
  if (!filename) {
    return null;
  }

  return ROAD_SIGN_IMAGE_BY_NAME.get(filename) ?? null;
};

const resolveSignCode = (rawCode: unknown, rawTitle: unknown): string => {
  const code = String(rawCode ?? '').trim();
  if (code) {
    return code;
  }

  const title = String(rawTitle ?? '').trim();
  const match = title.match(/^(\d+\.\d+(?:\.\d+)?)/u);
  return match ? match[1] : '';
};

const Signs: React.FC = () => {
  const { langId, t } = useLanguage();

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<SignCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SignCategoryItem | null>(null);

  const [signsLoading, setSignsLoading] = useState(false);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [previewSign, setPreviewSign] = useState<SignItem | null>(null);

  useIonViewWillEnter(() => {
    setSelectedCategory(null);
    setSigns([]);
    setPreviewSign(null);
  });

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setSelectedCategory(null);
      setSigns([]);
      setPreviewSign(null);

      try {
        const rows = await dbService.getSignCategories(langId);
        if (!cancelled) {
          setCategories(
            (rows ?? []).map((row: any) => ({
              id: Number(row.id),
              title: String(row.title ?? ''),
            })),
          );
        }
      } catch (error) {
        console.error('Failed to load sign categories', error);
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [langId]);

  useEffect(() => {
    let cancelled = false;

    const loadSigns = async () => {
      if (!selectedCategory) {
        return;
      }

      setSignsLoading(true);
      setPreviewSign(null);

      try {
        const rows = await dbService.getSignsByCategory(selectedCategory.id, langId);
        if (!cancelled) {
          setSigns(
            (rows ?? []).map((row: any) => ({
              id: Number(row.id),
              image: row.image ? String(row.image) : null,
              code: resolveSignCode(row.code, row.title),
              title: String(row.title ?? ''),
              description: row.description ? String(row.description) : null,
            })),
          );
        }
      } catch (error) {
        console.error('Failed to load signs by category', error);
        if (!cancelled) {
          setSigns([]);
        }
      } finally {
        if (!cancelled) {
          setSignsLoading(false);
        }
      }
    };

    loadSigns();

    return () => {
      cancelled = true;
    };
  }, [langId, selectedCategory]);

  const openCategory = (category: SignCategoryItem) => {
    setSelectedCategory(category);
  };

  const closeCategory = () => {
    setSelectedCategory(null);
    setSigns([]);
    setPreviewSign(null);
  };

  const pageTitle = selectedCategory ? selectedCategory.title : t('signs');

  return (
    <IonPage className="signs-page">
      <IonHeader translucent className="signs-header ion-no-border">
        <IonToolbar className="signs-toolbar">
          {selectedCategory && (
            <IonButtons slot="start">
              <IonButton fill="clear" className="signs-back-btn" onClick={closeCategory}>
                <IonIcon icon={chevronBackOutline} className="signs-back-icon" />
                <span>{t('previous')}</span>
              </IonButton>
            </IonButtons>
          )}
          <IonTitle className="signs-title-sm">{pageTitle}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="signs-content">
        <IonHeader collapse="condense" className="signs-header-condense ion-no-border">
          <IonToolbar className="signs-toolbar-lg">
            <IonTitle size="large" className="signs-title-lg">
              {pageTitle}
            </IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="signs-wrap">
          {categoriesLoading ? (
            <div className="signs-loader">
              <IonSpinner name="crescent" color="primary" />
            </div>
          ) : selectedCategory ? (
            <>
              {signsLoading ? (
                <div className="signs-loader">
                  <IonSpinner name="crescent" color="primary" />
                </div>
              ) : signs.length === 0 ? (
                <div className="signs-empty-card">
                  <IonIcon icon={imageOutline} className="signs-empty-icon" />
                  <h3>{t('no_signs')}</h3>
                </div>
              ) : (
                <div className="signs-list">
                  {signs.map((sign) => {
                    const imageSrc = resolveSignImage(sign.image);

                    return (
                      <article key={sign.id} className="sign-card">
                        <button type="button" className="sign-open-area" onClick={() => setPreviewSign(sign)}>
                          <div className="sign-thumb">
                            {imageSrc ? (
                              <img src={imageSrc} alt={sign.title} />
                            ) : (
                              <IonIcon icon={imageOutline} />
                            )}
                          </div>

                          <div className="sign-body">
                            <div className="sign-id">
                              {t('sign_number')} {sign.code || `#${sign.id}`}
                            </div>
                            <h3>{sign.title || `${t('sign')} #${sign.id}`}</h3>
                          </div>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : categories.length === 0 ? (
            <div className="signs-empty-card">
              <IonIcon icon={imageOutline} className="signs-empty-icon" />
              <h3>{t('no_sign_categories')}</h3>
            </div>
          ) : (
            <>
              <div className="sign-categories-list">
                {categories.map((category, index) => (
                  <button key={category.id} type="button" className="sign-category-row" onClick={() => openCategory(category)}>
                    <div className="sign-category-row-main">
                      <span className="sign-category-id">{index+1}.</span>
                      <span className="sign-category-title">{category.title}</span>
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="sign-category-arrow" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={Boolean(previewSign)} onDidDismiss={() => setPreviewSign(null)} className="sign-preview-modal">
        <IonContent className="sign-preview-content">
          <div className="sign-preview-wrap">
            <div className="sign-preview-head">
              <div className="sign-preview-title">{t('sign_details')}</div>
              <button type="button" className="sign-preview-close" onClick={() => setPreviewSign(null)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            {previewSign && (
              <>
                <div className="sign-preview-image-wrap">
                  {resolveSignImage(previewSign.image) ? (
                    <img src={resolveSignImage(previewSign.image) as string} alt={previewSign.title} className="sign-preview-image" />
                  ) : (
                    <div className="sign-preview-image-empty">
                      <IonIcon icon={imageOutline} />
                    </div>
                  )}
                </div>

                <div className="sign-preview-meta">
                  {t('sign_number')} {previewSign.code || `#${previewSign.id}`}
                </div>
                <h2 className="sign-preview-name">{previewSign.title}</h2>
                <p className="sign-preview-description">{previewSign.description || t('sign_description_empty')}</p>

                <IonButton expand="block" className="sign-preview-close-btn" onClick={() => setPreviewSign(null)}>
                  {t('close')}
                </IonButton>
              </>
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Signs;
