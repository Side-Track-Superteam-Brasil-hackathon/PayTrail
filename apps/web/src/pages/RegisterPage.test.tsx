import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';
import { ThemeProvider } from '../theme/ThemeContext';

const register = vi.fn();
const navigate = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ register }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    register.mockReset();
    navigate.mockReset();
    register.mockResolvedValue(undefined);
  });

  it('defaults to freelancer and allows switching to accountant', () => {
    render(
      <ThemeProvider><MemoryRouter><RegisterPage /></MemoryRouter></ThemeProvider>,
    );

    const freelancer = screen.getByRole('radio', { name: /service provider/i });
    const accountant = screen.getByRole('radio', { name: /i'm an accountant/i });
    expect(freelancer).toHaveAttribute('aria-checked', 'true');
    expect(accountant).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(accountant);

    expect(accountant).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /create accountant account/i })).toBeInTheDocument();
  });

  it('sends the selected role with the account data', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><MemoryRouter><RegisterPage /></MemoryRouter></ThemeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: /i'm an accountant/i }));
    await user.type(screen.getByLabelText('Name'), 'Carlos Silva');
    await user.type(screen.getByLabelText('Email'), 'carlos@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /create accountant account/i }));

    await vi.waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        name: 'Carlos Silva',
        email: 'carlos@example.com',
        password: 'password123',
        role: 'ACCOUNTANT',
      }),
    );
  });
});
