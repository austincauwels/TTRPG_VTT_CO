import { apiFetch } from '../utils/api';

// POST /campaign/create, used by the form on the GM ticket and the Lightkeeper Ledger form.
// Callers pass the already-trimmed name and code; each form keeps its own validation.
export const createCampaign = (name, code, userId) => apiFetch(
  `/campaign/create?name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}&user_id=${userId || ''}`,
  { method: 'POST' }
);
