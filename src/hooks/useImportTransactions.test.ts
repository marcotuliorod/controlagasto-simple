import { describe, it, expect, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useImportTransactions } from './useImportTransactions';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeFile(name: string, type: string, sizeBytes = 100) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

// bankPatterns.ts (via the process-import-file edge function) owns bank
// detection/classification and is covered separately in bankPatterns.test.ts.
// This hook's own responsibility is orchestration: which file types it
// accepts and its client-side validation before ever calling the backend.
describe('useImportTransactions', () => {
  describe('getFileType (via processFile validation)', () => {
    it('accepts a .csv file', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      expect(result.current.getFileType(makeFile('extrato.csv', 'text/csv'))).toBe('csv');
    });

    it('accepts .ofx and .qfx files', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      expect(result.current.getFileType(makeFile('extrato.ofx', ''))).toBe('ofx');
      expect(result.current.getFileType(makeFile('extrato.qfx', ''))).toBe('ofx');
    });

    it('accepts a .pdf file', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      expect(result.current.getFileType(makeFile('extrato.pdf', 'application/pdf'))).toBe('pdf');
    });

    it('falls back to MIME type when the extension is missing', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      expect(result.current.getFileType(makeFile('extrato', 'text/csv'))).toBe('csv');
      expect(result.current.getFileType(makeFile('extrato', 'application/pdf'))).toBe('pdf');
    });

    it('returns null for an unsupported extension and MIME type', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      expect(result.current.getFileType(makeFile('extrato.txt', 'text/plain'))).toBeNull();
    });
  });

  describe('processFile validation', () => {
    it('rejects an unsupported file type before calling the backend', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });

      result.current.processFile.mutate({ file: makeFile('extrato.txt', 'text/plain') });

      await waitFor(() => expect(result.current.processFile.isError).toBe(true));
      expect(result.current.processFile.error).toBeInstanceOf(Error);
      expect((result.current.processFile.error as Error).message).toMatch(/não suportado/);
    });

    it('rejects a PDF larger than the 5MB limit before calling the backend', async () => {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      const oversizedPdf = makeFile('extrato.pdf', 'application/pdf', 6 * 1024 * 1024);

      result.current.processFile.mutate({ file: oversizedPdf });

      await waitFor(() => expect(result.current.processFile.isError).toBe(true));
      expect((result.current.processFile.error as Error).message).toMatch(/5MB/);
    });
  });
});
