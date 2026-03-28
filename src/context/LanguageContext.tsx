import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type Language = 'am' | 'ru';
type TranslationMap = Record<string, string>;

interface LanguageContextType {
  language: Language;
  langId: number;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, TranslationMap> = {
  am: {
    home: 'Գլխավոր',
    account: 'Օգտահաշիվ',
    signs: 'Նշաններ',
    sign: 'Նշան',
    sign_categories: 'Նշանների կատեգորիաներ',
    sign_categories_total: 'Կատեգորիաների քանակ',
    signs_total: 'Նշանների քանակ',
    signs_search: 'Որոնել նշանը',
    open_category: 'Բացել կատեգորիան',
    open_sign: 'Բացել նշանը',
    sign_number: 'Նշան',
    sign_details: 'Նշանի մանրամասներ',
    sign_description_empty: 'Նկարագրություն առկա չէ',
    no_sign_categories: 'Նշանների կատեգորիաներ չկան',
    no_signs: 'Նշաններ չկան',
    no_signs_found: 'Նշան չի գտնվել',
    close: 'Փակել',
    rules: 'Կանոններ',
    rules_short: 'ՃԵԿ',
    road_rules: 'Ճանապարհային երթևեկության կանոններ',
    road_rules_hint: 'Բաժիններ և կանոններ',
    road_safety_law: 'Ճանապարհային երթեվեկության անվտանգության ապահովման մասին օրենք',
    road_safety_law_hint: 'Հոդվածների ցանկ',
    exploitation_rules: 'Շահագործումն արգելող պայմաններ',
    exploitation_rules_hint: 'Անսարքություններ և պայմաններ',
    road_markings: 'Ճանապարհային գծանշումներ',
    road_markings_hint: 'Հորիզոնական և ուղղաձիգ գծանշումներ',
    rules_chapters: 'Գլուխներ',
    rules_items: 'կետ',
    rule_item: 'Կետ',
    rule_marker: 'Գծանշում',
    no_chapters: 'Գլուխներ չեն գտնվել',
    no_rules_data: 'Տվյալներ չեն գտնվել',
    tests: 'Թեստեր',
    profile: 'Օգտահաշիվ',
    settings: 'Կարգավորումներ',
    statistics: 'Վիճակագրություն',
    data_management: 'Տվյալների կառավարում',
    clear_statistics: 'Մաքրել վիճակագրությունը',
    clear_statistics_description: 'Կջնջվեն պատասխանները, սխալները և քննությունների առաջընթացը։ Ընտրյալ հարցերը կպահպանվեն։',
    clear_statistics_title: 'Մաքրե՞լ վիճակագրությունը',
    clear_statistics_message: 'Այս գործողությունից հետո ձեր պատասխանները, սխալները և քննությունների արդյունքները կջնջվեն։',
    statistics_cleared: 'Վիճակագրությունը մաքրվել է',
    smart_training: 'Խելացի մարզում',
    smart_training_hint: 'Ալգորիթմը կընտրի այն թեմաները, որոնք պետք է կրկնել',
    smart_training_intro: 'Այստեղ հավաքվում են այն թեմաները, որտեղ ունեք սխալներ կամ անավարտ առաջընթաց։',
    smart_training_empty: 'Թույլ թեմաներ դեռ չեն հայտնաբերվել',
    smart_training_empty_hint: 'Լուծեք մի քանի տեսական հարց, և այստեղ կստանաք անձնական առաջարկներ։',
    smart_training_primary: 'Առաջարկվող թեմա',
    smart_training_start: 'Սկսել այս թեմայից',
    smart_training_reason_weak: 'Պետք է կրկնել',
    smart_training_reason_incomplete: 'Թեման մինչև վերջ անցած չէ',
    wrong_answers_stat: 'Սխալներ',
    accuracy_stat: 'Ճիշտ պատասխաններ',
    answered_progress: 'Առաջընթաց',
    questions_stat: 'Հարցեր',
    tickets_stat: 'Տոմսեր',
    readiness: 'Առաջընթաց',
    my_errors: 'Իմ սխալները',
    pass_exam: 'Հանձնել քննություն',
    training_by_topics: 'Տեսական հարցաշարեր',
    theory_topics: 'Ընտրեք թեման, որը ցանկանում եք սովորել',
    exam_tests: 'Քննական թեստեր',
    favorites: 'Ընտրյալներ',
    favorites_total: 'Ընդամենը ընտրյալ հարցեր',
    favorites_search: 'Որոնել ընտրյալ հարցը',
    favorites_empty_hint: 'Հարցը պահելու համար սեղմեք աստղիկը հարցի էջում',
    no_favorites_found: 'Ընտրյալ հարց չի գտնվել',
    open_question: 'Բացել հարցը',
    remove_favorite: 'Հեռացնել',
    saved_questions: 'Պահպանեք ամենաբարդ հարցերը',
    no_favorites: 'Ընտրյալ հարցեր դեռ չկան',
    question: 'հարց',
    questions: 'հարց',
    next: 'Հաջորդը',
    previous: 'Հետ',
    finish: 'Ավարտել',
    result: 'Արդյունք',
    score: 'Միավոր',
    correct_answers: 'Ճիշտ պատասխաններ',
    no_wrong_answers: 'Դեռևս սխալ պատասխաններ չկան',
    continue_training: 'Շարունակեք մարզվել',
    no_questions: 'Այս բաժնում հարցեր դեռ չկան',
    open_test: 'Բացել թեստը',
    start_exam: 'Սկսել քննությունը',
    completed: 'Անցած',
    of: '/',
    exam_passed: 'Քննությունը հանձնված է',
    exam_failed: 'Քննությունը չի հանձնված',
    back_to_tests: 'Վերադառնալ թեստերին',
    category_test: 'Թեմա',
    stop_training_title: 'Դադարեցնել մարզումը',
    stop_training_message: 'Վստա՞հ եք, որ ցանկանում եք դադարեցնել մարզումը։',
    yes: 'Այո',
    no: 'Ոչ',
    cancel: 'Չեղարկել',
  },
  // Пока оставляем RU как fallback-заглушку. Можно отдельно заполнить позже.
  ru: {},
};

const DEFAULT_LANGUAGE: Language = 'am';
const LANGUAGE_IDS: Record<Language, number> = {
  am: 102,
  ru: 101,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const value = useMemo<LanguageContextType>(() => {
    const t = (key: string): string => {
      return translations[language][key] ?? translations.am[key] ?? key;
    };

    return {
      language,
      langId: LANGUAGE_IDS[language],
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
