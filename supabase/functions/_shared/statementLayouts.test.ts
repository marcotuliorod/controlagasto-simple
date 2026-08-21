import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { matchStatementLayout, monthFromAbbrev } from "./statementLayouts.ts";
import { isReliable, parseStatement } from "./statementParser.ts";

// As fixtures são a saída real de `extractPdfText()` sobre dois PDFs Nubank de
// verdade (extrato jul/2026 e fatura venc. 03/08/2026), com os dados do titular
// e das contrapartes trocados por nomes fictícios de mesmo formato. Datas e
// valores estão intactos — é o que faz os checksums abaixo valerem.
const CONTA = await Deno.readTextFile(
  new URL("./fixtures/nubank-conta.txt", import.meta.url),
);
const FATURA = await Deno.readTextFile(
  new URL("./fixtures/nubank-fatura.txt", import.meta.url),
);

/** Soma em centavos: somar reais em float acumula erro e mascara diferença. */
function totalCents(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0);
}

Deno.test("monthFromAbbrev cobre os doze meses e rejeita o resto", () => {
  assertEquals(monthFromAbbrev("JAN"), 1);
  assertEquals(monthFromAbbrev("jun"), 6);
  assertEquals(monthFromAbbrev("DEZ"), 12);
  assertEquals(monthFromAbbrev("MAY"), null);
  assertEquals(monthFromAbbrev(""), null);
});

// ---------------------------------------------------------------------------
// Extrato de conta
// ---------------------------------------------------------------------------

Deno.test("extrato Nubank: casa a assinatura do layout", () => {
  assertEquals(matchStatementLayout(CONTA)?.layout, "nubank-conta");
});

// Os totais vêm impressos no próprio PDF ("Total de entradas +1.259,00",
// "Total de saídas -4.280,06"). Conferir contra eles pega tanto lançamento
// perdido quanto lançamento contado duas vezes — que é o modo de falha que o
// usuário não tem como perceber sozinho.
Deno.test("extrato Nubank: créditos batem com o total de entradas do PDF", () => {
  const { transactions } = parseStatement(CONTA);
  const creditos = transactions.filter((t) => t.indicator === "C");
  assertEquals(creditos.length, 4);
  assertEquals(totalCents(creditos.map((t) => t.amount)), 125_900);
});

Deno.test("extrato Nubank: débitos batem com o total de saídas do PDF", () => {
  const { transactions } = parseStatement(CONTA);
  const debitos = transactions.filter((t) => t.indicator === "D");
  assertEquals(debitos.length, 9);
  assertEquals(totalCents(debitos.map((t) => t.amount)), 428_006);
});

Deno.test("extrato Nubank: 13 lançamentos, nenhum totalizador virou transação", () => {
  const { transactions } = parseStatement(CONTA);
  assertEquals(transactions.length, 13);
  // "Total de entradas + 20,00" e "Total de saídas - 50,00" são cabeçalho de
  // grupo. Se algum escapasse, cada dia entraria em dobro.
  assert(
    transactions.every((t) => !/^Total de/i.test(t.description)),
    "totalizador virou transação",
  );
  // O bloco-resumo da primeira página vem antes da primeira data.
  assert(
    transactions.every((t) => !/^Saldo|Rendimento/i.test(t.description)),
    "linha de saldo virou transação",
  );
});

Deno.test("extrato Nubank: a data se propaga através da quebra de página", () => {
  const { transactions } = parseStatement(CONTA);
  // O grupo de 03 JUL abre na página 1 e o boleto BTT cai na página 2, depois
  // do cabeçalho repetido. Se o cabeçalho resetasse a data, esta some.
  const boleto = transactions.find((t) => /BTT TELECOMUNICACOES/i.test(t.description));
  assert(boleto, "lançamento após a quebra de página não foi lido");
  assertEquals(boleto.date, "2026-07-03");
  assertEquals(boleto.amount, 199);
  assertEquals(boleto.indicator, "D");
});

Deno.test("extrato Nubank: data por extenso vira ISO e cobre todo o período", () => {
  const { transactions } = parseStatement(CONTA);
  const datas = transactions.map((t) => t.date);
  assertEquals(datas[0], "2026-07-01");
  assertEquals(datas[datas.length - 1], "2026-07-31");
  assert(
    datas.every((d) => /^2026-07-\d{2}$/.test(d)),
    "data fora do período do extrato",
  );
});

Deno.test("extrato Nubank: é confiável, então a IA não é acionada", () => {
  assert(isReliable(parseStatement(CONTA)));
});

// ---------------------------------------------------------------------------
// Fatura de cartão
// ---------------------------------------------------------------------------

Deno.test("fatura Nubank: casa a assinatura do layout", () => {
  assertEquals(matchStatementLayout(FATURA)?.layout, "nubank-fatura");
});

Deno.test("fatura Nubank: as compras somam o total a pagar do PDF", () => {
  const { transactions } = parseStatement(FATURA);
  const compras = transactions.filter((t) => t.indicator === "D");
  assertEquals(compras.length, 69);
  // "Total a pagar R$ 6.263,50" na página de resumo.
  assertEquals(totalCents(compras.map((t) => t.amount)), 626_350);
});

Deno.test("fatura Nubank: pagamento com sinal Unicode vira crédito", () => {
  const { transactions } = parseStatement(FATURA);
  const pagamentos = transactions.filter((t) => t.indicator === "C");
  assertEquals(pagamentos.length, 1);
  // "Pagamento em 30 JUN −R$ 4.575,66" usa U+2212, não hífen ASCII. Lido como
  // débito, viraria uma despesa fantasma do valor da fatura anterior.
  assertEquals(pagamentos[0].amount, 4575.66);
  assertEquals(pagamentos[0].date, "2026-06-30");
});

Deno.test("fatura Nubank: infere o ano a partir do vencimento", () => {
  const { transactions } = parseStatement(FATURA);
  // Vencimento 03 AGO 2026, período 26 JUN a 27 JUL: nada é de 2025.
  assert(
    transactions.every((t) => /^2026-0[67]-\d{2}$/.test(t.date)),
    "data fora do período da fatura",
  );
  const amazon = transactions.find((t) => /Amazon Prime/i.test(t.description));
  assert(amazon);
  assertEquals(amazon.date, "2026-06-26");
});

Deno.test("fatura Nubank: páginas de resumo e simulação não viram lançamento", () => {
  const { transactions } = parseStatement(FATURA);
  const proibidos = [
    /Total de compras/i, // "…, 26 JUN a 27 JUL R$ 6.166,34" (resumo)
    /Total a pagar/i, // tabela de simulação de parcelamento
    /Pagamento m[íi]nimo/i,
    /Fatura anterior/i,
    /Convers[ãa]o/i, // "Conversão: BRL 5.28 = USD 1 = R$ 5,28"
    /^Fulano T D Silva/i, // subtotal do portador
  ];
  for (const padrao of proibidos) {
    assert(
      !transactions.some((t) => padrao.test(t.description)),
      `linha de resumo virou lançamento: ${padrao}`,
    );
  }
});

Deno.test("fatura Nubank: cartão mascarado sai da descrição", () => {
  const { transactions } = parseStatement(FATURA);
  assert(
    transactions.every((t) => !/^[•·*]{2,}/.test(t.description)),
    "descrição começa com o cartão mascarado",
  );
  const uber = transactions.find((t) => /^Uber/i.test(t.description));
  assert(uber, "descrição não foi limpa");
});

Deno.test("fatura Nubank: é confiável, então a IA não é acionada", () => {
  assert(isReliable(parseStatement(FATURA)));
});

// ---------------------------------------------------------------------------
// Convivência com a regra genérica
// ---------------------------------------------------------------------------

Deno.test("texto de outro banco não casa layout nenhum", () => {
  const outroBanco =
    "BANCO DO BRASIL S.A. EXTRATO DE CONTA CORRENTE 05/01/2024 SUPERMERCADO EXTRA 350,80 D";
  assertEquals(matchStatementLayout(outroBanco), null);
});

Deno.test("parseStatement delega para a regra genérica quando não há layout", () => {
  const outroBanco =
    "05/01/2024 SUPERMERCADO EXTRA 350,80 D 07/01/2024 PIX RECEBIDO JOAO 200,00 C";
  const { transactions } = parseStatement(outroBanco);
  assertEquals(transactions.length, 2);
  assertEquals(transactions[0].description, "SUPERMERCADO EXTRA");
  assertEquals(transactions[1].indicator, "C");
});

Deno.test("assinatura Nubank sem transação legível não bloqueia a regra genérica", () => {
  // Documento que casa a assinatura do extrato mas traz os lançamentos no
  // formato genérico. O leitor de layout devolve vazio e a genérica assume.
  const hibrido =
    "Nu Pagamentos S.A. Movimentações\n05/01/2024 SUPERMERCADO EXTRA 350,80 D";
  const { transactions } = parseStatement(hibrido);
  assertEquals(transactions.length, 1);
  assertEquals(transactions[0].description, "SUPERMERCADO EXTRA");
});
