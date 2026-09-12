#!/usr/bin/env node
import { parse, prettyPrint, isbn10ToIsbn13, isbn13ToIsbn10 } from './index';

function printUsage(): void {
  process.stderr.write(
    'usage: isbn-check <code> [--to-isbn13 | --to-isbn10]\n' +
      '  <code>        an ISBN-10, ISBN-13, EAN-13, EAN-8, or UPC-A, with or without hyphens\n' +
      '  --to-isbn13   convert a valid ISBN-10 to ISBN-13 instead of reporting on it\n' +
      '  --to-isbn10   convert a valid ISBN-13 to ISBN-10 instead of reporting on it\n'
  );
}

function main(argv: string[]): number {
  const toIsbn13 = argv.includes('--to-isbn13');
  const toIsbn10 = argv.includes('--to-isbn10');
  const args = argv.filter((a) => a !== '--to-isbn13' && a !== '--to-isbn10');

  if (args.length !== 1 || (toIsbn13 && toIsbn10)) {
    printUsage();
    return 1;
  }

  const code = args[0];

  if (toIsbn13 || toIsbn10) {
    try {
      const converted = toIsbn13 ? isbn10ToIsbn13(code) : isbn13ToIsbn10(code);
      process.stdout.write(`${converted}\n`);
      return 0;
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      return 1;
    }
  }

  const result = parse(code);
  if (!result.ok) {
    process.stderr.write(`invalid: ${result.reason}\n`);
    return 1;
  }

  if (!result.valid) {
    process.stderr.write(
      `${result.format} invalid: check digit is ${result.checkDigit}, expected ${result.expectedCheckDigit}\n`
    );
    return 1;
  }

  process.stdout.write(`${result.format} valid ${prettyPrint(result)}\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
