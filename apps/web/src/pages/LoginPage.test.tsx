import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { ThemeProvider } from '../theme/ThemeContext';

const login = vi.fn();
const navigate = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    navigate.mockReset();
  });

  it('submits credentials and navigates home after login', async () => {
    login.mockResolvedValue(undefined);
    render(
      <ThemeProvider><MemoryRouter><LoginPage /></MemoryRouter></ThemeProvider>,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('ana@example.com', 'password123'));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the API error and restores the submit button after failure', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    render(
      <ThemeProvider><MemoryRouter><LoginPage /></MemoryRouter></ThemeProvider>,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
