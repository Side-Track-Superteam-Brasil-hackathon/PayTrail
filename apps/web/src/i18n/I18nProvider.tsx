import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { en, pt, type MessageKey } from './messages';

export type Lang = 'en' | 'pt';
export type Vars = Record<string, string | number>;

const STORAGE_KEY = 'paytrail.lang';
const DICTS: Record<Lang, Record<MessageKey, string>> = { en, pt };

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt') return saved;
  } catch {
    // storage indisponível (aba anônima etc.): cai no idioma do navegador
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

// Idioma atual também em nível de módulo, para funções fora de componentes (format.ts, mensagens de erro).
let current: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = current === 'pt' ? 'pt-BR' : 'en';

/** Traduz uma chave; `{nome}` no texto é trocado por `vars.nome`. */
export function translate(key: MessageKey, vars?: Vars): string {
  const text = DICTS[current][key] ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

/** Locale do Intl para o idioma atual (datas e números). */
export function currentLocale(): string {
  return current === 'pt' ? 'pt-BR' : 'en-US';
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof translate;
  locale: string;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  const setLang = useCallback((next: Lang) => {
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sem storage: vale só para esta aba
    }
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
    setLangState(next);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translate, locale: currentLocale() }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Use em todo componente com texto: além de `t`, faz o componente re-renderizar ao trocar o idioma. */
export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fora do I18nProvider');
  return ctx;
}
