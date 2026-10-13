import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';
import { ThemeProvider } from '../theme/ThemeContext';
import { I18nProvider } from '../i18n/I18nProvider';

describe('LandingPage', () => {
  it('presents the product value and primary calls to action', () => {
    render(
      <I18nProvider><ThemeProvider><MemoryRouter><LandingPage /></MemoryRouter></ThemeProvider></I18nProvider>,
    );

    expect(screen.getByRole('heading', { name: /get paid globally/i })).toBeInTheDocument();
    expect(screen.getByText(/usdc payments, invoices and brl records/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /get started/i })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /create your free account/i })).toHaveAttribute('href', '/register');
  });

  it('exposes the product feature section from the hero link', () => {
    render(
      <I18nProvider><ThemeProvider><MemoryRouter><LandingPage /></MemoryRouter></ThemeProvider></I18nProvider>,
    );

    expect(screen.getByRole('link', { name: /see how paytrail works/i })).toHaveAttribute('href', '#how-it-works');
    expect(document.querySelector('#how-it-works')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /everything in its place/i })).toBeInTheDocument();
  });
});
