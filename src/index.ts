import { isbn10CheckDigit, gs1CheckDigit, checkDigitToChar } from './checksum';

export { isbn10CheckDigit, gs1CheckDigit, checkDigitToChar };

export type BarcodeFormat = 'isbn10' | 'isbn13' | 'ean13' | 'ean8' | 'upc-a';

export interface ParseSuccess {
  ok: true;
  format: BarcodeFormat;
  /** Digits only (plus a trailing 'X' for ISBN-10), hyphens and spaces removed. */
  normalized: string;
  checkDigit: string;
  expectedCheckDigit: string;
  valid: boolean;
}

export interface ParseFailure {
  ok: false;
  reason: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

const LENGTH_TO_FORMAT: Record<number, BarcodeFormat> = {
  8: 'ean8',
  10: 'isbn10',
  12: 'upc-a',
  13: 'ean13',
};

function strip(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

function charToDigit(c: string): number | null {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  return null;
}

/**
 * Parses and validates an ISBN or barcode string. Accepts hyphens and spaces
 * as separators (they're stripped before checking). Never throws: structural
 * problems (wrong length, bad characters) come back as `{ ok: false }`, and a
 * recognizable but wrong checksum comes back as `{ ok: true, valid: false }`
 * so callers can tell "not a barcode" from "a barcode, but mistyped" apart.
 */
export function parse(input: string): ParseResult {
  const normalized = strip(input);
  const format = LENGTH_TO_FORMAT[normalized.length];
  if (!format) {
    return { ok: false, reason: `unrecognized length ${normalized.length}; expected 8, 10, 12, or 13 digits` };
  }

  if (format === 'isbn10') {
    const body: number[] = [];
    for (let i = 0; i < 9; i++) {
      const d = charToDigit(normalized[i]);
      if (d === null) return { ok: false, reason: `character '${normalized[i]}' at position ${i + 1} is not a digit` };
      body.push(d);
    }
    const lastChar = normalized[9];
    const actual = lastChar === 'X' ? 10 : charToDigit(lastChar);
    if (actual === null) return { ok: false, reason: `invalid check character '${lastChar}'` };
    const expected = isbn10CheckDigit(body);
    return {
      ok: true,
      format,
      normalized,
      checkDigit: checkDigitToChar(actual),
      expectedCheckDigit: checkDigitToChar(expected),
      valid: actual === expected,
    };
  }

  // ean8 / upc-a / ean13 (and isbn13, a 978/979-prefixed ean13) all share the
  // GS1 mod-10 algorithm; only the label differs.
  const digits: number[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const d = charToDigit(normalized[i]);
    if (d === null) return { ok: false, reason: `character '${normalized[i]}' at position ${i + 1} is not a digit` };
    digits.push(d);
  }
  const body = digits.slice(0, -1);
  const actual = digits[digits.length - 1];
  const expected = gs1CheckDigit(body);
  const resolvedFormat: BarcodeFormat =
    format === 'ean13' && (normalized.startsWith('978') || normalized.startsWith('979')) ? 'isbn13' : format;

  return {
    ok: true,
    format: resolvedFormat,
    normalized,
    checkDigit: checkDigitToChar(actual),
    expectedCheckDigit: checkDigitToChar(expected),
    valid: actual === expected,
  };
}

/** Shorthand for callers that only care whether a code is well-formed and correct. */
export function isValid(input: string): boolean {
  const result = parse(input);
  return result.ok && result.valid;
}

/**
 * Groups a parsed code into its structurally-known parts and joins them with
 * hyphens. This deliberately does not attempt real ISBN registrant-group or
 * publisher-range hyphenation (978-0-14-... style) — that requires the
 * official GS1/ISBN range table, which isn't bundled here. What it does group
 * is only what the format itself defines: the GS1 prefix on ISBN-13/EAN-13,
 * the number-system digit on UPC-A, and the check digit everywhere.
 */
export function prettyPrint(parsed: ParseSuccess): string {
  const n = parsed.normalized;
  switch (parsed.format) {
    case 'isbn10':
      return `${n.slice(0, 9)}-${n.slice(9)}`;
    case 'isbn13':
    case 'ean13':
      return `${n.slice(0, 3)}-${n.slice(3, 12)}-${n.slice(12)}`;
    case 'upc-a':
      return `${n.slice(0, 1)}-${n.slice(1, 11)}-${n.slice(11)}`;
    case 'ean8':
      return `${n.slice(0, 7)}-${n.slice(7)}`;
  }
}

/** Formats directly from a raw string, for callers that don't need the parsed record. */
export function format(input: string): string {
  const result = parse(input);
  if (!result.ok) throw new Error(result.reason);
  return prettyPrint(result);
}

/**
 * Converts an ISBN-10 to its ISBN-13 form by prepending the GS1 "978" Bookland
 * prefix and recomputing the check digit with the mod-10 algorithm instead of
 * mod-11 — the two formats never share a check digit for the same 9-digit body.
 * Throws if `input` isn't a structurally valid ISBN-10 with a correct check digit.
 */
export function isbn10ToIsbn13(input: string): string {
  const result = parse(input);
  if (!result.ok) throw new Error(result.reason);
  if (result.format !== 'isbn10') throw new Error(`expected an ISBN-10, got ${result.format}`);
  if (!result.valid) throw new Error('cannot convert an ISBN-10 with an incorrect check digit');

  const body = result.normalized.slice(0, 9).split('').map(Number);
  const check = gs1CheckDigit([9, 7, 8, ...body]);
  return `978${body.join('')}${checkDigitToChar(check)}`;
}

/**
 * Converts an ISBN-13 back to ISBN-10. Only 978-prefixed ISBN-13s have an
 * ISBN-10 equivalent — the 979 range was introduced after ISBN-10 was retired,
 * so those codes never had one. Throws if `input` isn't a valid, convertible
 * ISBN-13.
 */
export function isbn13ToIsbn10(input: string): string {
  const result = parse(input);
  if (!result.ok) throw new Error(result.reason);
  if (result.format !== 'isbn13') throw new Error(`expected an ISBN-13, got ${result.format}`);
  if (!result.valid) throw new Error('cannot convert an ISBN-13 with an incorrect check digit');
  if (!result.normalized.startsWith('978')) {
    throw new Error('only 978-prefixed ISBN-13s have an ISBN-10 equivalent');
  }

  const body = result.normalized.slice(3, 12).split('').map(Number);
  const check = isbn10CheckDigit(body);
  return `${body.join('')}${checkDigitToChar(check)}`;
}
