# isbn-barcode-checksums

Every ISBN and most retail barcodes (EAN-13, EAN-8, UPC-A) end in a check
digit computed from the digits before it. If you fat-finger a digit while
typing one in, the checksum almost always catches it. This library does two
things with that fact: it tells you whether a code is valid, and it renders
a code in a readable, hyphenated form.

It's built on two observations that keep the implementation small:

- ISBN-13 *is* an EAN-13 (it just happens to start with 978 or 979), so one
  mod-10 routine covers ISBN-13, EAN-13, EAN-8, and UPC-A.
- ISBN-10 predates that scheme and uses its own mod-11 checksum, where the
  check digit can be the letter `X` (representing the value 10).

There's no dependency on the official ISBN range tables, so hyphenation is
limited to the parts a format actually defines structurally (the GS1 prefix,
the UPC-A number-system digit, the check digit) rather than guessing at
publisher boundaries.

## Usage

```ts
import { parse, isValid, format } from './src/index';

parse('978-0-13-468599-1');
// {
//   ok: true,
//   format: 'isbn13',
//   normalized: '9780134685991',
//   checkDigit: '1',
//   expectedCheckDigit: '1',
//   valid: true
// }

parse('0-13-468599-2'); // correct check digit is 7, not 2
// { ok: true, format: 'isbn10', normalized: '0134685992', checkDigit: '2', expectedCheckDigit: '7', valid: false }

isValid('036000291452'); // true — a UPC-A
isValid('not a barcode'); // false

format('9780134685991'); // '978-013468599-1'

isbn10ToIsbn13('0-13-468599-7'); // '9780134685991'
isbn13ToIsbn10('978-0-13-468599-1'); // '0134685997'
```

`parse` never throws. A string with a bad length or stray characters comes
back as `{ ok: false, reason: string }`. A string of the right shape but a
wrong check digit comes back as `{ ok: true, valid: false, ... }` so callers
can distinguish "this isn't a barcode at all" from "this is a barcode, but
someone mistyped a digit."

## Supported formats

| Format   | Length | Checksum algorithm |
|----------|--------|---------------------|
| ISBN-10  | 10     | mod 11, weights 10..1, check digit may be `X` |
| ISBN-13  | 13 (prefix 978/979) | GS1 mod 10 |
| EAN-13   | 13     | GS1 mod 10 |
| UPC-A    | 12     | GS1 mod 10 |
| EAN-8    | 8      | GS1 mod 10 |

Hyphens and spaces in input are ignored, so `978-0-13-468599-1` and
`9780134685991` parse identically.

## ISBN-10 / ISBN-13 conversion

`isbn10ToIsbn13` and `isbn13ToIsbn10` convert between the two ISBN checksums.
Both require the input to already be structurally valid with a correct check
digit — they convert, they don't repair. `isbn13ToIsbn10` only works on
978-prefixed codes; the 979 range postdates ISBN-10, so those codes have no
ISBN-10 form and the function throws for them.

## Building

There are no runtime dependencies. To compile with `tsc` (any recent
TypeScript install works — none is vendored here):

```
tsc
```

Output goes to `dist/`.

## Status

Early. See the checksum math, parsing, and ISBN-10/13 conversion above for
what's solid; a CLI and a test suite aren't written yet.
