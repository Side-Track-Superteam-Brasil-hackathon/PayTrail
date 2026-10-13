import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewInvoicePage } from './NewInvoicePage';
import { I18nProvider } from '../../i18n/I18nProvider';

const { api, navigate } = vi.hoisted(() => ({
  api: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <NewInvoicePage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('NewInvoicePage', () => {
  beforeEach(() => {
    api.mockReset();
    navigate.mockReset();
    api.mockResolvedValue({ id: 'invoice-123' });
  });

  it('creates a Solana invoice and opens its details', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/client name/i), 'Acme Inc');
    await user.type(screen.getByLabelText(/description/i), 'Landing page');
    await user.type(screen.getByLabelText(/amount/i), '1500');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith('/invoices', {
        method: 'POST',
        body: expect.stringContaining('"network":"SOLANA"'),
      });
      expect(navigate).toHaveBeenCalledWith('/invoices/invoice-123');
    });

    expect(JSON.parse(api.mock.calls[0][1].body)).toMatchObject({
      clientName: 'Acme Inc',
      description: 'Landing page',
      network: 'SOLANA',
      baseAmount: '1500.00',
    });
  });
});
