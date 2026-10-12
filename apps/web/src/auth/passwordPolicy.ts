import type { MessageKey } from '../i18n/messages';

/** Política de senha do cadastro: espelha PasswordPolicy.java (specs/00-produto.md §Decisões fixadas). */
export interface PasswordRule {
  key: MessageKey;
  ok: (password: string) => boolean;
}

export const PASSWORD_MIN_LENGTH = 12;
const MAX_BYTES = 72;

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'password.length', ok: (p) => [...p].length >= PASSWORD_MIN_LENGTH },
  { key: 'password.number', ok: (p) => /\p{Nd}/u.test(p) },
  { key: 'password.upper', ok: (p) => /\p{Lu}/u.test(p) },
  { key: 'password.lower', ok: (p) => /\p{Ll}/u.test(p) },
  { key: 'password.symbol', ok: (p) => /[^\p{L}\p{Nd}\s]/u.test(p) },
];

/** Só aparece quando violada (caso raro: senha enorme). */
export const PASSWORD_TOO_LONG: PasswordRule = {
  key: 'password.tooLong',
  ok: (p) => new TextEncoder().encode(p).length <= MAX_BYTES,
};

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.ok(password)) && PASSWORD_TOO_LONG.ok(password);
}
