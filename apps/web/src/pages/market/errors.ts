import { ApiError } from '../../api/client';
import { translate } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';

const FRIENDLY: Record<string, MessageKey> = {
  PROPOSAL_ALREADY_OPEN: 'market.error.proposalAlreadyOpen',
  ROLES_INVALID: 'market.error.rolesInvalid',
  NO_ACCESS: 'market.error.noAccess',
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const key = FRIENDLY[e.code];
    return key ? translate(key) : e.message;
  }
  return e instanceof Error ? e.message : translate('common.unexpectedError');
}
