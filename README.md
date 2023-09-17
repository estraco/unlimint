# Unlimint

`Unlimint` is a Node.js library for working with insanely large integers. It is made in pure TypeScript and has no dependencies. Types are included.

## Installation

```bash
npm install unlimint
```

## Usage

```typescript
import UnlimInt from 'unlimint';

const hex = '1234567890abcdef1234567890abcdef';
const dec = '1234567890123456789012345678901234567890';
const bin = '1010101010101010101010101010101010101010101010101010101010101010';

const hexInt1 = UnlimInt.fromHex(hex);
const hexInt2 = UnlimInt.fromString(hex, 16);

const decInt1 = UnlimInt.fromDecimal(dec);
const decInt2 = UnlimInt.fromString(dec, 10);

const binInt1 = UnlimInt.fromBinary(bin);
const binInt2 = UnlimInt.fromString(bin, 2);

// all arguments are UnlimInt unless the argument is an index, radix, string, or shift
// operations prefixed with 'c' return a new instance, others mutate the instance and return it

const sum = hexInt1.add(hexInt2);
const sub = hexInt1.sub(hexInt2);
const mul = hexInt1.mul(hexInt2);
const div = hexInt1.div(hexInt2);
const mod = hexInt1.mod(hexInt2);

const pow = hexInt1.pow(UnlimInt.fromNumber(2));

const and = hexInt1.bitAnd(hexInt2);
const or = hexInt1.bitOr(hexInt2);
const xor = hexInt1.bitXor(hexInt2);
const not = hexInt1.bitNot();

const lShift = hexInt1.cshiftLeft(2);
const rShift = hexInt1.cshiftRight(2);

const cmp = hexInt1.compare(hexInt2);
const eq = hexInt1.equals(hexInt2);
const gt = hexInt1.greaterThan(hexInt2);
const lt = hexInt1.lessThan(hexInt2);
const gte = hexInt1.greaterThanOrEqualTo(hexInt2);
const lte = hexInt1.lessThanOrEqualTo(hexInt2);

// toString() accepts radix as an argument (default is 10, radix must be between 2 and 36)
const hexStr = hexInt1.toString(16);
const decStr = hexInt1.toString(10);
const binStr = hexInt1.toString(2);
```

## License

[GPL-3.0](https://choosealicense.com/licenses/gpl-3.0/) © [1nchhh](https://github.com/1nchhh)

## Author

All work is done by [me](https://github.com/1nchhh)
