import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gera, em memória, um PDF real (com camada de texto) do extrato Nubank
 * anonimizado em `supabase/functions/_shared/fixtures/nubank-conta.txt`.
 *
 * Por que gerar em vez de commitar um `.pdf` estático: `process-import-file`
 * faz um check de hash do arquivo ANTES de qualquer parsing
 * (`index.ts:825-848` — `generateFileHash` contra `import_sessions`) e recusa
 * reimportação com "Este arquivo já foi importado anteriormente." Um PDF
 * estático faria o teste passar uma vez e falhar em toda re-execução contra
 * o mesmo usuário (CI sem reset de banco entre rodadas). `token` vira uma
 * linha extra no fim do documento — muda o hash a cada chamada sem criar
 * uma transação fantasma: não bate `NUCONTA_AMOUNT` (sem valor no fim da
 * linha), então `nuContaParse` descarta como "linha de continuação".
 *
 * Layout PDF 1.4 escrito à mão (mesmo espírito de
 * `supabase/functions/export-pdf/index.ts`, mas byte-exato: construído como
 * Buffer desde o início, não como string + TextEncoder, que corrompe offsets
 * quando o conteúdo tem acento). Página única artificialmente alta em vez de
 * múltiplas páginas reais — evita gerenciar vários objetos de página/stream
 * para um documento de ~85 linhas.
 *
 * `extractPdfText()` (`supabase/functions/_shared/pdfText.ts`) reconstrói
 * linhas pela posição (x, y) de cada item de texto — o requisito é só "cada
 * linha do extrato é uma operação de texto posicionada em y decrescente".
 * Validado manualmente com `unpdf` (a mesma lib que `pdfText.ts` usa): as 85
 * linhas retornam na ordem certa, byte-a-byte iguais ao `.txt` de origem.
 */

const MARGIN = 50;
const FONT_SIZE = 9;
const LINE_HEIGHT = 14;
const PAGE_WIDTH = 595;

/** WinAnsiEncoding (~CP1252) para o range usado neste fixture: ASCII, acentos
 * latinos (coincidem com Latin-1 em 0xA0-0xFF) e bullet (•) — U+2022 no
 * Unicode, mas byte 0x95 no CP1252. */
function toWinAnsiByte(codePoint: number): number {
  if (codePoint === 0x2022) return 0x95; // •
  if (codePoint <= 0xff) return codePoint;
  throw new Error(
    `Caractere fora do range WinAnsi suportado por este gerador: U+${codePoint.toString(16)}`,
  );
}

function encodeWinAnsi(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text) bytes.push(toWinAnsiByte(ch.codePointAt(0)!));
  return Buffer.from(bytes);
}

/** Escapa parênteses/barra invertida da string literal do PDF (\(...\)). */
function escapePdfString(buf: Buffer): Buffer {
  const out: number[] = [];
  for (const byte of buf) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out.push(0x5c); // ( ) \
    out.push(byte);
  }
  return Buffer.from(out);
}

export function buildNubankExtratoPdf(runToken: string): Buffer {
  const sourcePath = path.join(
    currentDir,
    '..',
    '..',
    'supabase/functions/_shared/fixtures/nubank-conta.txt',
  );
  const lines = readFileSync(sourcePath, 'utf-8')
    .split('\n')
    .filter((l) => l.length > 0);
  lines.push(`REF ${runToken}`);

  const pageHeight = MARGIN * 2 + lines.length * LINE_HEIGHT + 20;

  const contentChunks: Buffer[] = [];
  let y = pageHeight - MARGIN;
  for (const line of lines) {
    const escaped = escapePdfString(encodeWinAnsi(line));
    contentChunks.push(
      Buffer.concat([
        Buffer.from(`BT /F1 ${FONT_SIZE} Tf ${MARGIN} ${y} Td (`, 'ascii'),
        escaped,
        Buffer.from(') Tj ET\n', 'ascii'),
      ]),
    );
    y -= LINE_HEIGHT;
  }
  const contentStream = Buffer.concat(contentChunks);

  // Monta o PDF byte a byte, com offsets exatos (Buffer.length é sempre
  // contagem de bytes, ao contrário de string.length em JS).
  const parts: Buffer[] = [];
  let offset = 0;
  const objectOffsets: number[] = [];

  function push(buf: Buffer) {
    parts.push(buf);
    offset += buf.length;
  }

  push(Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1'));

  objectOffsets[1] = offset;
  push(Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'ascii'));

  objectOffsets[2] = offset;
  push(Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'ascii'));

  objectOffsets[3] = offset;
  push(
    Buffer.from(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
      'ascii',
    ),
  );

  objectOffsets[4] = offset;
  push(Buffer.from(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`, 'ascii'));
  push(contentStream);
  push(Buffer.from('\nendstream\nendobj\n', 'ascii'));

  objectOffsets[5] = offset;
  push(
    Buffer.from(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
      'ascii',
    ),
  );

  const xrefOffset = offset;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += `${String(objectOffsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(Buffer.from(xref, 'ascii'));
  push(
    Buffer.from(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'ascii'),
  );

  return Buffer.concat(parts);
}
