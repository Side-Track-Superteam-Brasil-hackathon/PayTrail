import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle({ compact = false, darkSurface = false }: { compact?: boolean; darkSurface?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'light' ? t('theme.switchToDark') : t('theme.switchToLight');
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact
        ? darkSurface
          ? 'inline-flex items-center justify-center rounded-lg p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white'
          : 'inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
        : 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50'}
      aria-label={label}
      title={label}
    >
      {theme === 'light' ? <Moon size={compact ? 20 : 16} /> : <Sun size={compact ? 20 : 16} />}
      {!compact && (theme === 'light' ? t('theme.dark') : t('theme.light'))}
    </button>
  );
}
