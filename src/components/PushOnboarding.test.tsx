import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import PushOnboarding from './PushOnboarding';

describe('PushOnboarding', () => {
  const mockOnActivate = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show onboarding if not seen before', async () => {
    render(
      <PushOnboarding 
        onActivate={mockOnActivate}
        onDismiss={mockOnDismiss}
      />
    );

    // Wait for dialog to appear (1s delay)
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(screen.queryByText('Ative as Notificações')).toBeTruthy();
  });

  it('should not show if already seen', () => {
    localStorage.setItem('push-onboarding-seen', 'true');
    
    render(
      <PushOnboarding 
        onActivate={mockOnActivate}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Ative as Notificações')).toBeNull();
  });

  it('should call onActivate when activate button is clicked', async () => {
    render(
      <PushOnboarding 
        onActivate={mockOnActivate}
        onDismiss={mockOnDismiss}
      />
    );

    await new Promise(resolve => setTimeout(resolve, 1100));

    const activateButton = screen.getByText('Ativar Notificações');
    fireEvent.click(activateButton);

    expect(mockOnActivate).toHaveBeenCalled();
    expect(localStorage.getItem('push-onboarding-seen')).toBe('true');
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    render(
      <PushOnboarding 
        onActivate={mockOnActivate}
        onDismiss={mockOnDismiss}
      />
    );

    await new Promise(resolve => setTimeout(resolve, 1100));

    const dismissButton = screen.getByText('Agora não');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalled();
    expect(localStorage.getItem('push-onboarding-seen')).toBe('true');
  });

  it('should display all benefits', async () => {
    render(
      <PushOnboarding 
        onActivate={mockOnActivate}
        onDismiss={mockOnDismiss}
      />
    );

    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(screen.getByText('Alertas de Meta')).toBeTruthy();
    expect(screen.getByText('Insights Financeiros')).toBeTruthy();
    expect(screen.getByText('Lembretes')).toBeTruthy();
  });
});
