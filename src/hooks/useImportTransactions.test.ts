import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MB_BY_EXTENSION,
  useImportTransactions,
} from './useImportTransactions';

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
  beforeEach(() => {
    vi.mocked(supabase.functions.invoke).mockReset();
  });

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

    // O PDF é cortado em 5MB e os demais em 10MB. A zona de upload anunciava
    // 10MB para tudo, então um PDF de 6MB era aceito na tela e recusado aqui.
    it('accepts a 6MB CSV, which is under the 10MB limit for non-PDF files', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, transactions: [], totalCount: 0 },
        error: null,
      } as never);
      const { result } = renderHook(() => useImportTransactions(), { wrapper });

      result.current.processFile.mutate({ file: makeFile('extrato.csv', 'text/csv', 6 * 1024 * 1024) });

      await waitFor(() => expect(result.current.processFile.isSuccess).toBe(true));
    });
  });

  // Fonte única do limite: a zona de upload importa este mesmo mapa, para não
  // voltar a anunciar um número que o hook não pratica.
  describe('MAX_FILE_SIZE_MB', () => {
    it('maps every accepted extension to the limit of its file type', () => {
      expect(MAX_FILE_SIZE_MB_BY_EXTENSION['.pdf']).toBe(MAX_FILE_SIZE_MB.pdf);
      expect(MAX_FILE_SIZE_MB_BY_EXTENSION['.csv']).toBe(MAX_FILE_SIZE_MB.csv);
      expect(MAX_FILE_SIZE_MB_BY_EXTENSION['.ofx']).toBe(MAX_FILE_SIZE_MB.ofx);
      expect(MAX_FILE_SIZE_MB_BY_EXTENSION['.qfx']).toBe(MAX_FILE_SIZE_MB.ofx);
    });

    it('keeps the PDF limit below the others', () => {
      expect(MAX_FILE_SIZE_MB.pdf).toBeLessThan(MAX_FILE_SIZE_MB.csv);
    });
  });

  // `functions.invoke` devolve `data: null` em qualquer status não-2xx, então a
  // mensagem em português que a edge function escreveu no corpo se perdia e o
  // usuário via "Edge Function returned a non-2xx status code".
  describe('mensagem de erro da edge function', () => {
    function invokeFails(status: number, body: unknown) {
      const error = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        name: 'FunctionsHttpError',
        context: new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
      });
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error } as never);
    }

    async function messageForFailure() {
      const { result } = renderHook(() => useImportTransactions(), { wrapper });
      result.current.processFile.mutate({ file: makeFile('extrato.csv', 'text/csv') });
      await waitFor(() => expect(result.current.processFile.isError).toBe(true));
      return (result.current.processFile.error as Error).message;
    }

    it('surfaces the message the edge function put in the body', async () => {
      invokeFails(400, { success: false, error: 'O arquivo está vazio ou só tem o cabeçalho.' });
      expect(await messageForFailure()).toBe('O arquivo está vazio ou só tem o cabeçalho.');
    });

    it('falls back to Portuguese when the body is not JSON', async () => {
      invokeFails(502, '<html>Bad Gateway</html>');
      const message = await messageForFailure();
      expect(message).toMatch(/Não foi possível processar o arquivo/);
      expect(message).not.toMatch(/non-2xx/);
    });

    it('explains a gateway timeout instead of repeating the SDK message', async () => {
      invokeFails(504, '');
      expect(await messageForFailure()).toMatch(/demorou demais/);
    });
  });
});
