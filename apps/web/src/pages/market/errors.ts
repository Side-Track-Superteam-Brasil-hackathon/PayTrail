import { ApiError } from '../../api/client';

const FRIENDLY: Record<string, string> = {
  PROPOSAL_ALREADY_OPEN: 'There is already an open proposal in this conversation. Wait for a response or cancel it first.',
  ROLES_INVALID: 'Proposals can only be exchanged between a freelancer and an accountant.',
  NO_ACCESS: 'You do not have access to this data.',
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return FRIENDLY[e.code] ?? e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}
