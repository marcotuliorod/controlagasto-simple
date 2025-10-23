import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallPWA from './InstallPWA';

describe('InstallPWA', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Reset matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should show iOS instructions on iOS devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true
    });

    render(<InstallPWA />);
    
    // Verificar se as instruções iOS aparecem
    expect(screen.getByText(/Instalar App \(iOS\)/i)).toBeTruthy();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeTruthy();
  });

  it('should not show anything when already installed', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<InstallPWA />);
    expect(container.firstChild).toBeNull();
  });

  it('should dismiss iOS instructions when button is clicked', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true
    });

    render(<InstallPWA />);
    
    const dismissButton = screen.getByText('Entendi');
    fireEvent.click(dismissButton);
    
    // Verificar se foi salvo no localStorage
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy();
  });

  it('should not show if dismissed recently', () => {
    // Simular dismissal há 1 dia
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed', oneDayAgo.toISOString());

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true
    });

    const { container } = render(<InstallPWA />);
    expect(container.firstChild).toBeNull();
  });

  it('should show again after 7 days of dismissal', () => {
    // Simular dismissal há 8 dias
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed', eightDaysAgo.toISOString());

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true
    });

    render(<InstallPWA />);
    expect(screen.getByText(/Instalar App \(iOS\)/i)).toBeTruthy();
  });
});
