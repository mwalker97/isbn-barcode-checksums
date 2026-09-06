// Check digit algorithms only. No knowledge of hyphenation or formatting lives here.

/**
 * ISBN-10 uses a mod-11 weighted checksum: digit i (1-indexed from the left)
 * is multiplied by (11 - i), and the total must be divisible by 11.
 * The check digit that makes that true can itself be 10, which is written as 'X'.
 *
 * `digits` must be exactly the first 9 digits (0-9). Returns 0-10.
 */
export function isbn10CheckDigit(digits: number[]): number {
  if (digits.length !== 9) {
    throw new RangeError(`isbn10CheckDigit expects 9 digits, got ${digits.length}`);
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  const remainder = sum % 11;
  return (11 - remainder) % 11;
}

/**
 * The GS1 mod-10 algorithm behind ISBN-13, EAN-13, EAN-8, and UPC-A.
 * It's defined from the check digit outward: the data digit immediately
 * to its left is weighted 3, the next 1, alternating, regardless of how
 * long the overall code is. That's what lets one function cover every
 * length GS1 defines instead of hard-coding odd/even position tables
 * per format.
 *
 * `dataDigits` is every digit except the check digit itself.
 */
export function gs1CheckDigit(dataDigits: number[]): number {
  if (dataDigits.length === 0) {
    throw new RangeError('gs1CheckDigit expects at least one digit');
  }
  let sum = 0;
  let weight = 3;
  for (let i = dataDigits.length - 1; i >= 0; i--) {
    sum += dataDigits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** Renders a check digit value (0-10) the way it's written in the source: '0'..'9' or 'X'. */
export function checkDigitToChar(value: number): string {
  return value === 10 ? 'X' : String(value);
}
