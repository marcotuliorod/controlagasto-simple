import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isReliable, parseStatementText } from "./statementParser.ts";

// Texto achatado numa linha só é exatamente o que a extração de PDF devolve —
// por isso os testes usam essa forma, e não texto bem quebrado.
const EXTRATO_ACHATADO =
  "BANCO DO BRASIL S.A. EXTRATO DE CONTA CORRENTE Titular: MARIA APARECIDA SOUZA " +
  "CPF: 123.456.789-01 Agencia: 1234-5 Conta: 56789-0 SALDO ANTERIOR 2.500,00 C " +
  "05/01/2024 SUPERMERCADO EXTRA 350,80 D 07/01/2024 PIX RECEBIDO JOAO 200,00 C " +
  "10/01/2024 APLICACAO CDB DI 1.000,00 D 12/01/2024 POSTO IPIRANGA 180,00 D " +
  "15/01/2024 SALARIO EMPRESA XYZ 4.500,00 C SALDO FINAL 5.052,85 C";

Deno.test("lê transações de texto achatado, como vem do PDF", () => {
  const { transactions } = parseStatementText(EXTRATO_ACHATADO);
  assertEquals(transactions.length, 5);
  assertEquals(transactions[0], {
    date: "2024-01-05",
    description: "SUPERMERCADO EXTRA",
    amount: 350.8,
    indicator: "D",
  });
});

Deno.test("não confunde descrição com a transação seguinte", () => {
  const { transactions } = parseStatementText(EXTRATO_ACHATADO);
  assertEquals(transactions[1]!.description, "PIX RECEBIDO JOAO");
  assertEquals(transactions[4]!.description, "SALARIO EMPRESA XYZ");
});

Deno.test("ignora saldo anterior e saldo final", () => {
  const { transactions } = parseStatementText(EXTRATO_ACHATADO);
  const descricoes = transactions.map((t) => t.description).join(" ");
  assertEquals(descricoes.includes("SALDO"), false);
  // 2.500,00 e 5.052,85 são os saldos e não podem virar transação.
  assertEquals(transactions.some((t) => t.amount === 2500 || t.amount === 5052.85), false);
});

Deno.test("converte valor brasileiro com separador de milhar", () => {
  const { transactions } = parseStatementText("10/01/2024 APLICACAO CDB DI 1.000,00 D");
  assertEquals(transactions[0]!.amount, 1000);
});

Deno.test("aceita ano de dois dígitos", () => {
  const { transactions } = parseStatementText("05/01/24 MERCADO 50,00 D");
  assertEquals(transactions[0]!.date, "2024-01-05");
});

Deno.test("aceita transação sem indicador D/C", () => {
  const { transactions } = parseStatementText("05/01/2024 COMPRA CARTAO 99,90");
  assertEquals(transactions.length, 1);
  assertEquals(transactions[0]!.indicator, null);
});

Deno.test("rejeita data inexistente", () => {
  const { transactions } = parseStatementText("31/02/2024 MERCADO 50,00 D");
  assertEquals(transactions.length, 0);
});

Deno.test("ignora valor sem centavos, que costuma ser número de documento", () => {
  const { transactions } = parseStatementText("05/01/2024 TRANSFERENCIA 123456 50,00 D");
  assertEquals(transactions.length, 1);
  assertEquals(transactions[0]!.amount, 50);
  assertEquals(transactions[0]!.description, "TRANSFERENCIA 123456");
});

Deno.test("devolve vazio para texto sem transação", () => {
  const { transactions } = parseStatementText("EXTRATO INDISPONIVEL NO PERIODO SOLICITADO");
  assertEquals(transactions.length, 0);
});

Deno.test("chamadas sucessivas não vazam estado da regex", () => {
  const primeira = parseStatementText(EXTRATO_ACHATADO);
  const segunda = parseStatementText(EXTRATO_ACHATADO);
  assertEquals(primeira.transactions.length, segunda.transactions.length);
});

Deno.test("isReliable exige pelo menos uma transação", () => {
  assertEquals(isReliable({ transactions: [], unparsedCount: 0 }), false);
});

Deno.test("isReliable recusa quando há muito trecho ilegível", () => {
  const uma: ReturnType<typeof parseStatementText> = {
    transactions: [{ date: "2024-01-05", description: "X", amount: 1, indicator: null }],
    unparsedCount: 5,
  };
  assertEquals(isReliable(uma), false);
});

Deno.test("isReliable aceita resultado majoritariamente limpo", () => {
  assertEquals(isReliable(parseStatementText(EXTRATO_ACHATADO)), true);
});

/*
 * Extrato de conta corrente com quebras de linha e débito marcado por sinal
 * negativo, sem indicador D/C. É a forma que `pdfText.ts` entrega desde que
 * passou a reconstruir linhas pela posição dos itens.
 *
 * Este layout devolvia 2 transações inventadas em produção — o valor de um
 * lançamento emendava na descrição do seguinte — e `isReliable` aprovava,
 * porque nenhum match tinha falhado na conversão. Os testes existentes não
 * pegaram: todos usam texto achatado, valor positivo e indicador D/C.
 */
const EXTRATO_COM_LINHAS = [
  "BANCO EXEMPLO S.A.",
  "EXTRATO DE CONTA CORRENTE",
  "Agencia 0001 Conta 12345-6",
  "Periodo: 01/08/2026 a 17/08/2026",
  "DATA HISTORICO VALOR",
  "01/08/2026 SALDO ANTERIOR 1.250,00",
  "05/08/2026 SUPERMERCADO BOM PRECO -96,05",
  "07/08/2026 POSTO IPIRANGA -180,00",
  "09/08/2026 APLICACAO CDB DI -500,00",
  "12/08/2026 UBER TRIP -32,40",
  "14/08/2026 FARMACIA SAO JOAO -78,90",
  "17/08/2026 SALDO FINAL 362,65",
].join("\n");

Deno.test("lê extrato com quebras de linha e valor negativo", () => {
  const { transactions } = parseStatementText(EXTRATO_COM_LINHAS);
  assertEquals(transactions.length, 5);
  assertEquals(transactions.map((t) => t.description), [
    "SUPERMERCADO BOM PRECO",
    "POSTO IPIRANGA",
    "APLICACAO CDB DI",
    "UBER TRIP",
    "FARMACIA SAO JOAO",
  ]);
  assertEquals(transactions.map((t) => t.amount), [96.05, 180, 500, 32.4, 78.9]);
});

Deno.test("sinal negativo vale como indicador de débito", () => {
  const { transactions } = parseStatementText("05/08/2026 SUPERMERCADO -96,05");
  assertEquals(transactions[0]!.indicator, "D");
  // O valor fica positivo; quem carrega o sentido é o indicador.
  assertEquals(transactions[0]!.amount, 96.05);
});

Deno.test("indicador explícito tem precedência sobre o sinal", () => {
  const { transactions } = parseStatementText("07/01/2024 ESTORNO -200,00 C");
  assertEquals(transactions[0]!.indicator, "C");
});

Deno.test("descrição não atravessa quebra de linha", () => {
  const { transactions } = parseStatementText(EXTRATO_COM_LINHAS);
  const emendadas = transactions.filter((t) => t.description.includes("/"));
  assertEquals(emendadas, []);
});

Deno.test("cabeçalho com data e saldos não viram transação", () => {
  const { transactions } = parseStatementText(EXTRATO_COM_LINHAS);
  assertEquals(transactions.some((t) => t.description.includes("SALDO")), false);
  assertEquals(transactions.some((t) => t.amount === 1250 || t.amount === 362.65), false);
});

Deno.test("isReliable aceita o extrato com linhas", () => {
  assertEquals(isReliable(parseStatementText(EXTRATO_COM_LINHAS)), true);
});

Deno.test("isReliable recusa layout em que as linhas não são lidas", () => {
  // Data e valor presentes, mas separados por um formato que a regra não
  // conhece (valor antes da descrição). Antes isto devolvia zero transações e
  // zero ilegíveis, e o resultado passava como confiável assim que uma única
  // linha qualquer casasse.
  const desconhecido = [
    "05/08/2026 96,05- SUPERMERCADO BOM PRECO",
    "07/08/2026 180,00- POSTO IPIRANGA",
    "09/08/2026 500,00- APLICACAO CDB DI",
  ].join("\n");
  const resultado = parseStatementText(desconhecido);
  assertEquals(isReliable(resultado), false);
});
