import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { autoDetectMapping, needsColumnMapping } from "./csvMapping.ts";

// Layout mais comum de extrato brasileiro exportado em CSV: a data é a
// primeira coluna. É o caso que o bug do índice 0 quebrava.
const HEADERS_BB = ["data", "histórico", "valor", "saldo"];

Deno.test("detecta a data na coluna 0", () => {
  const mapping = autoDetectMapping(HEADERS_BB);
  assertEquals(mapping.date, 0);
  assertEquals(mapping.description, 1);
  assertEquals(mapping.amount, 2);
  assertEquals(mapping.balance, 3);
});

Deno.test("CSV com data na coluna 0 não pede mapeamento manual", () => {
  assertEquals(needsColumnMapping(autoDetectMapping(HEADERS_BB)), false);
});

Deno.test("valor na coluna 0 não é sobrescrito por coluna posterior", () => {
  // 'valor' e 'total' casam os dois com o campo amount. A primeira é a boa —
  // 'total' costuma ser consolidado. Com `!mapping[field]`, amount virava 3.
  const mapping = autoDetectMapping(["valor", "descrição", "data", "total"]);
  assertEquals(mapping.amount, 0);
  assertEquals(mapping.date, 2);
});

Deno.test("primeira coluna vence também fora do índice 0", () => {
  const mapping = autoDetectMapping(["descrição", "data", "data movimento"]);
  assertEquals(mapping.date, 1);
});

Deno.test("pede mapeamento quando falta campo obrigatório", () => {
  // Sem nenhuma coluna de valor.
  const mapping = autoDetectMapping(["data", "histórico", "saldo"]);
  assertEquals(mapping.amount, undefined);
  assertEquals(needsColumnMapping(mapping), true);
});

Deno.test("tipo e saldo são opcionais", () => {
  const mapping = autoDetectMapping(["data", "descrição", "valor"]);
  assertEquals(mapping.type, undefined);
  assertEquals(mapping.balance, undefined);
  assertEquals(needsColumnMapping(mapping), false);
});

Deno.test("cabeçalho não reconhecido não mapeia nada", () => {
  const mapping = autoDetectMapping(["col_a", "col_b"]);
  assertEquals(mapping, {});
  assertEquals(needsColumnMapping(mapping), true);
});
