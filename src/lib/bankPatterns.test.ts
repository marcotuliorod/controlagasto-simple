import { describe, it, expect } from 'vitest';
import { detectBank, classifyTransaction, extractMerchantName } from './bankPatterns';

describe('detectBank', () => {
  it('detects Nubank from statement content', () => {
    const bank = detectBank('Extrato Nubank - Conta corrente\nNu Pagamentos S.A.');
    expect(bank?.name).toBe('nubank');
  });

  it('detects Itaú from statement content, accented or not', () => {
    expect(detectBank('ITAU UNIBANCO - Extrato')?.name).toBe('itau');
    expect(detectBank('Itaú Unibanco S.A.')?.name).toBe('itau');
  });

  it('detects Banco do Brasil via its abbreviation', () => {
    const bank = detectBank('Extrato Conta Corrente - BB S.A.');
    expect(bank?.name).toBe('banco_do_brasil');
  });

  it('returns null for content matching no supported bank', () => {
    expect(detectBank('Extrato de conta genérico sem identificação de banco')).toBeNull();
  });
});

describe('classifyTransaction', () => {
  it('classifies balance/total lines as ignore, regardless of type', () => {
    expect(classifyTransaction('SALDO ANTERIOR', 'credit')).toBe('ignore');
    expect(classifyTransaction('Total Geral', 'debit')).toBe('ignore');
  });

  it('classifies investment operations as investment even on credit (resgate)', () => {
    expect(classifyTransaction('APL.BB FUNDOS RENDA FIXA', 'debit')).toBe('investment');
    expect(classifyTransaction('RESG.BB FUNDOS RENDA FIXA', 'credit')).toBe('investment');
  });

  it('classifies government transfers as government', () => {
    expect(classifyTransaction('REPASSE FPE/FPM', 'credit')).toBe('government');
  });

  it('classifies explicit income patterns as income even when type is debit', () => {
    expect(classifyTransaction('PIX RECEBIDO João Silva', 'debit')).toBe('income');
  });

  it('defaults any other credit transaction to income', () => {
    expect(classifyTransaction('Depósito não identificado', 'credit')).toBe('income');
  });

  it('classifies transfer patterns as transfer for review', () => {
    expect(classifyTransaction('PIX ENVIADO Maria Souza', 'debit')).toBe('transfer');
  });

  it('classifies known expense patterns as expense', () => {
    expect(classifyTransaction('COMPRA CARTAO SUPERMERCADO ABC', 'debit')).toBe('expense');
  });

  it('defaults an unmatched debit to expense', () => {
    expect(classifyTransaction('LOJA XYZ PAGAMENTO', 'debit')).toBe('expense');
  });
});

describe('extractMerchantName', () => {
  it('returns empty string for empty input', () => {
    expect(extractMerchantName('')).toBe('');
  });

  it('strips a leading PIX/TED/DOC prefix and title-cases the remainder', () => {
    expect(extractMerchantName('PIX ENVIADO PADARIA DO JOAO')).toBe('Padaria Do Joao');
  });

  it('strips embedded dates', () => {
    expect(extractMerchantName('COMPRA CARTAO 25/12 RESTAURANTE SABOR')).toBe('Restaurante Sabor');
  });

  it('normalizes asterisks used by card processors (UBER *TRIP)', () => {
    expect(extractMerchantName('UBER *TRIP')).toBe('Uber Trip');
  });

  it('takes only the first segment before a separator', () => {
    expect(extractMerchantName('POSTO SHELL - AVENIDA PRINCIPAL')).toBe('Posto Shell');
  });

  it('falls back to a truncated raw description when nothing significant remains', () => {
    // A description that is *only* noise (numbers) collapses to '' after
    // cleanup, so the function should fall back to the raw description.
    expect(extractMerchantName('123456789')).toBe('123456789');
  });
});
