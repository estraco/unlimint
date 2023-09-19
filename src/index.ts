export type NumBase = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 64;

export type CacheOp = '+' | '-' | '*' | '/%' | '^';

export type CacheEntry = {
    op: CacheOp;
    i1: UnlimInt;
    i2: UnlimInt;
    result: UnlimInt | {
        quotient: UnlimInt;
        remainder: UnlimInt;
    };
};

export type CacheKey = `${CacheOp};${string};${string}`;

export default class UnlimInt {
    public static DEFAULT_CACHE_SIZE = 1000;

    private buf: Buffer;
    public size: number;
    public negative: boolean;

    private static CACHE_ENABLED = false;
    private static CACHE_SIZE = UnlimInt.DEFAULT_CACHE_SIZE;
    private static cache: Map<CacheKey, CacheEntry> = new Map();
    private static cacheHits = 0;
    private static cacheMisses = 0;

    /*
    Most significant bit is first, least significant byte is first
    */

    constructor(size: number, negative: boolean) {
        this.buf = Buffer.alloc(Math.ceil(size / 8));
        this.size = size;
        this.negative = negative;
    }

    public static enableCache(size = this.CACHE_SIZE): void {
        this.CACHE_ENABLED = true;
        this.CACHE_SIZE = size;
    }

    public static disableCache(clear = true): void {
        this.CACHE_ENABLED = false;

        if (clear) {
            this.cache = new Map();
            this.cacheHits = 0;
            this.cacheMisses = 0;
        }
    }

    private static cacheGet(op: '/%', i1: UnlimInt, i2: UnlimInt): {
        quotient: UnlimInt;
        remainder: UnlimInt;
    } | null;
    private static cacheGet(op: '+' | '-' | '*' | '^', i1: UnlimInt, i2: UnlimInt): UnlimInt | null;
    private static cacheGet(op: CacheOp, i1: UnlimInt, i2: UnlimInt): UnlimInt | {
        quotient: UnlimInt;
        remainder: UnlimInt;
    } | null {
        if (!this.CACHE_ENABLED) {
            return null;
        }

        const key = `${op};${i1.toString(64)};${i2.toString(64)}` as CacheKey;

        const entry = this.cache.get(key);

        if (!entry) {
            this.cacheMisses++;

            return null;
        }

        this.cacheHits++;

        return entry.result;
    }

    private static cacheSet(op: '/%', i1: UnlimInt, i2: UnlimInt, result: {
        quotient: UnlimInt;
        remainder: UnlimInt;
    }): void;
    private static cacheSet(op: '+' | '-' | '*' | '^', i1: UnlimInt, i2: UnlimInt, result: UnlimInt): void;
    private static cacheSet(op: '+' | '-' | '*' | '/%' | '^', i1: UnlimInt, i2: UnlimInt, result: UnlimInt | {
        quotient: UnlimInt;
        remainder: UnlimInt;
    }): void {
        if (!this.CACHE_ENABLED) {
            return;
        }

        const key = `${op};${i1.toString(64)};${i2.toString(64)}` as CacheKey;

        this.cache.set(key, {
            op,
            i1,
            i2,
            result
        });

        if (this.CACHE_SIZE === -1) {
            return;
        }

        if (this.cache.size > this.CACHE_SIZE) {
            this.cache.delete(this.cache.keys().next().value);
        }
    }

    public static cacheStats(): { hit: number; miss: number; size: number; maxSize: number; hitRate: number } {
        return {
            hit: this.cacheHits,
            miss: this.cacheMisses,
            size: this.cache.size,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) * 100,
            maxSize: this.CACHE_SIZE
        };
    }

    public getBit(index: number): boolean {
        return (this.buf[Math.floor(index / 8)] & (1 << (index % 8))) != 0;
    }

    public getByte(index: number): number {
        return this.buf[index];
    }

    public setBit(index: number, value: boolean): void {
        if (index >= this.size) {
            throw new Error(`Index ${index} is out of bounds, size is ${this.size}`);
        }

        const mask = 1 << (index % 8);

        if (value) {
            this.buf[Math.floor(index / 8)] |= mask;
        } else {
            this.buf[Math.floor(index / 8)] &= ~mask;
        }
    }

    public cadd(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '+')): UnlimInt {
        const cached = UnlimInt.cacheGet('+', this, other);

        if (cached) {
            return cached;
        }

        const result = new UnlimInt(size, this.negative);
        let carry = 0;

        for (let i = 0; i < result.size; i++) {
            let sum = +this.getBit(i) + +other.getBit(i) + carry;

            if (sum > 1) {
                sum -= 2;
                carry = 1;
            } else {
                carry = 0;
            }

            result.setBit(i, sum === 1);
        }

        UnlimInt.cacheSet('+', this, other, result);

        return result;
    }

    public add(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '+')): UnlimInt {
        const result = this.cadd(other, size);

        this.buf = result.buf;
        this.size = result.size;

        return this;
    }

    public csub(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '-')): UnlimInt {
        const cached = UnlimInt.cacheGet('-', this, other);

        if (cached) {
            return cached;
        }

        const result = new UnlimInt(size, this.negative);
        let borrow = 0;

        for (let i = 0; i < result.size; i++) {
            let diff = +this.getBit(i) - +other.getBit(i) - borrow;

            if (diff < 0) {
                diff += 2;
                borrow = 1;
            } else {
                borrow = 0;
            }

            result.setBit(i, diff === 1);
        }

        UnlimInt.cacheSet('-', this, other, result);

        return result;
    }

    public sub(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '-')): UnlimInt {
        const result = this.csub(other, size);

        this.buf = result.buf;
        this.size = result.size;

        return this;
    }

    public cmul(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '*')): UnlimInt {
        const cached = UnlimInt.cacheGet('*', this, other);

        if (cached) {
            return cached;
        }

        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < this.size; i++) {
            if (this.getBit(i)) {
                result.add(other.cshiftLeft(i));
            }
        }

        UnlimInt.cacheSet('*', this, other, result);

        return result;
    }

    public mul(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '*')): UnlimInt {
        const result = this.cmul(other, size);

        this.buf = result.buf;
        this.size = result.size;

        return this;
    }

    public cpow(other: UnlimInt): UnlimInt {
        const cached = UnlimInt.cacheGet('^', this, other);

        if (cached) {
            return cached;
        }

        if (other.negative) {
            throw new Error('Exponent must be positive');
        }

        const result = UnlimInt.fromNumber(1);

        for (let i = UnlimInt.fromNumber(0); i.lessThan(other); i.add(UnlimInt.fromNumber(1))) {
            result.mul(this);
        }

        UnlimInt.cacheSet('^', this, other, result);

        return result;
    }

    public pow(other: UnlimInt): UnlimInt {
        const result = this.cpow(other);

        this.buf = result.buf;
        this.size = result.size;

        return this;
    }

    private divop(divisor: UnlimInt): {
        quotient: UnlimInt,
        remainder: UnlimInt
    } {
        const cached = UnlimInt.cacheGet('/%', this, divisor);

        if (cached) {
            return cached;
        }

        const dvsr = divisor.ctrim();

        /* Start base cases */
        if (dvsr.isZero()) {
            throw new Error('Division by zero');
        }

        if (this.isZero()) {
            return {
                quotient: UnlimInt.fromNumber(0),
                remainder: this.ctrim()
            };
        }

        if (dvsr.greaterThan(this)) {
            return {
                quotient: UnlimInt.fromNumber(0),
                remainder: this.ctrim()
            };
        }

        if (dvsr.equals(this)) {
            return {
                quotient: UnlimInt.fromNumber(1).mul(UnlimInt.fromNumber(this.negative ? -1 : 1)),
                remainder: UnlimInt.fromNumber(0)
            };
        }

        if (dvsr.equals(UnlimInt.fromNumber(1))) {
            return {
                quotient: this.copy(),
                remainder: UnlimInt.fromNumber(0)
            };
        }
        /* End base cases */

        // if the size of both numbers is less than 32, use the built-in BigInt (probably faster and more memory efficient)
        if (this.size < 32 && dvsr.size < 32) {
            const result = this.toBigInt() / dvsr.toBigInt();

            const r = {
                quotient: UnlimInt.fromBigInt(result),
                remainder: this.csub(dvsr.cmul(UnlimInt.fromBigInt(result)))
            };

            UnlimInt.cacheSet('/%', this, divisor, r);

            return r;
        }

        /* Start recursive cases */
        // multiply divisor by 2^i
        // if larger, end and divide to get rem and quot

        let i = 0;
        const temp = dvsr.copy();

        // somewhat inefficient, but it works
        while (temp.lessThan(this)) {
            temp.shiftLeft(1);
            i++;
        }

        if (temp.greaterThan(this)) {
            temp.shiftRight(1);
            i--;
        }

        const rem = this.csub(temp);
        const div = UnlimInt.fromNumber(2).cpow(UnlimInt.fromNumber(i));

        const divmod = rem.divop(dvsr);

        const quotient = div.cadd(divmod.quotient);

        const r = {
            quotient: quotient.ctrim(),
            remainder: divmod.remainder.ctrim()
        };

        UnlimInt.cacheSet('/%', this, divisor, r);

        return r;
    }

    public div(divisor: UnlimInt): UnlimInt {
        return this.divop(divisor).quotient;
    }

    public mod(other: UnlimInt): UnlimInt {
        return this.divop(other).remainder;
    }

    public bitAnd(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '&')): UnlimInt {
        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < result.size; i++) {
            result.setBit(i, this.getBit(i) && other.getBit(i));
        }

        return result;
    }

    public bitOr(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '|')): UnlimInt {
        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < result.size; i++) {
            result.setBit(i, this.getBit(i) || other.getBit(i));
        }

        return result;
    }

    public bitXor(other: UnlimInt, size: number = UnlimInt.calcSize(this, other, '~')): UnlimInt {
        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < result.size; i++) {
            result.setBit(i, this.getBit(i) !== other.getBit(i));
        }

        return result;
    }

    public bitNot(): UnlimInt {
        const result = new UnlimInt(this.size, !this.negative);

        for (let i = 0; i < result.size; i++) {
            result.setBit(i, !this.getBit(i));
        }

        return result;
    }

    public getMSB(): number;
    public getMSB(against: UnlimInt): number;
    public getMSB(against?: UnlimInt): number {
        if (against) {
            if (this.size !== against.size) {
                throw new Error('Both numbers must be the same size');
            }

            for (let i = this.size - 1; i >= 0; i--) {
                if (this.getBit(i) && !against.getBit(i)) {
                    return i;
                } else if (!this.getBit(i) && against.getBit(i)) {
                    return i;
                }
            }

            return -1;
        } else {
            for (let i = this.size - 1; i >= 0; i--) {
                if (this.getBit(i)) {
                    return i;
                }
            }

            return -1;
        }
    }

    public negate(): UnlimInt {
        this.negative = !this.negative;

        return this;
    }

    public cnegate(): UnlimInt {
        return this.copy().negate();
    }

    public isZero(): boolean {
        for (let i = 0; i < this.size; i++) {
            if (this.getBit(i)) {
                return false;
            }
        }

        return true;
    }

    public greaterThan(other: UnlimInt): boolean {
        if (this.getMSB() > other.getMSB()) {
            return true;
        } else if (this.getMSB() < other.getMSB()) {
            return false;
        }

        for (let i = this.size - 1; i >= 0; i--) {
            if (this.getBit(i) && !other.getBit(i)) {
                return true;
            } else if (!this.getBit(i) && other.getBit(i)) {
                return false;
            }
        }

        return false;
    }

    public lessThan(other: UnlimInt): boolean {
        if (this.getMSB() > other.getMSB()) {
            return false;
        } else if (this.getMSB() < other.getMSB()) {
            return true;
        }

        for (let i = this.size - 1; i >= 0; i--) {
            if (this.getBit(i) && !other.getBit(i)) {
                return false;
            } else if (!this.getBit(i) && other.getBit(i)) {
                return true;
            }
        }

        return false;
    }

    public greaterThanOrEqualTo(other: UnlimInt): boolean {
        if (this.getMSB() > other.getMSB()) {
            return true;
        } else if (this.getMSB() < other.getMSB()) {
            return false;
        }

        for (let i = this.size - 1; i >= 0; i--) {
            if (this.getBit(i) && !other.getBit(i)) {
                return true;
            } else if (!this.getBit(i) && other.getBit(i)) {
                return false;
            }
        }

        return true;
    }

    public lessThanOrEqualTo(other: UnlimInt): boolean {
        if (this.getMSB() > other.getMSB()) {
            return false;
        } else if (this.getMSB() < other.getMSB()) {
            return true;
        }

        for (let i = this.size - 1; i >= 0; i--) {
            if (this.getBit(i) && !other.getBit(i)) {
                return false;
            } else if (!this.getBit(i) && other.getBit(i)) {
                return true;
            }
        }

        return true;
    }

    public shiftLeft(count: number): void {
        // need to expand the buffer if the shift is too big
        if ((count + this.trimmedSize()) > this.size) {
            const buf = Buffer.alloc(Math.ceil((count + this.trimmedSize()) / 8));

            this.buf.copy(buf);

            this.buf = buf;
            this.size = count + this.trimmedSize();
        }

        // move bits to the left
        for (let i = this.size - 1; i >= count; i--) {
            this.setBit(i, this.getBit(i - count));
        }

        // fill the rest with zeroes
        for (let i = count - 1; i >= 0; i--) {
            this.setBit(i, false);
        }
    }

    public cshiftLeft(count: number): UnlimInt {
        const result = this.copy();

        result.shiftLeft(count);

        return result;
    }

    public shiftRight(count: number): void {
        // need to expand the buffer if the shift is too big
        if (count > this.size) {
            const buf = Buffer.alloc(Math.ceil(count / 8));

            this.buf.copy(buf);

            this.buf = buf;
            this.size = count;
        }

        // move bits to the right
        for (let i = 0; i < this.size - count; i++) {
            this.setBit(i, this.getBit(i + count));
        }

        // fill the rest with zeroes
        for (let i = this.size - count; i < this.size; i++) {
            this.setBit(i, false);
        }
    }

    public equals(other: UnlimInt): boolean {
        if (this.trimmedSize() !== other.trimmedSize()) {
            return false;
        }

        for (let i = 0; i < this.size; i++) {
            if (this.getBit(i) !== other.getBit(i)) {
                return false;
            }
        }

        return true;
    }

    public cshiftRight(count: number): UnlimInt {
        const result = this.copy();

        result.shiftRight(count);

        return result;
    }

    public compare(other: UnlimInt): number {
        if (this.greaterThan(other)) {
            return 1;
        } else if (this.lessThan(other)) {
            return -1;
        } else {
            return 0;
        }
    }

    public toNumber(): number {
        if (this.size > 32) {
            throw new Error('Number overflow, please use toBigInt, toBuffer or toString');
        }

        let result = 0;

        for (let i = 0; i < this.size; i++) {
            if (this.getBit(i)) {
                result |= 1 << i;
            }
        }

        return result;
    }

    public toBigInt(): bigint {
        if (this.size > 64) {
            throw new Error('Number overflow, please use toBuffer or toString');
        }

        let result = BigInt(0);

        for (let i = 0; i < this.size; i++) {
            if (this.getBit(i)) {
                result |= BigInt(1) << BigInt(i);
            }
        }

        return result;
    }

    public toBuffer(): Buffer {
        const result = Buffer.alloc(this.buf.length);

        this.buf.copy(result);

        return result;
    }

    // public toString(base: 2 | 10 | 16 = 2): string {
    public toString(base: NumBase = 2): string {
        if (base < 2 || base > 36 && base !== 64) {
            throw new Error('Base must be between 2 and 36');
        }

        // if (![2, 10, 16].includes(base)) {
        //     throw new Error('Only bases 2, 10 and 16 are supported currently');
        // }

        let result = '';

        if (base === 2) {
            for (let i = 0; i < this.buf.length; i++) {
                result = this.buf[i].toString(2).padStart(8, '0') + result;
            }

            /* remove leading zeroes but only if the number is not zero */
            if (result !== '0') {
                result = result.replace(/^0+/, '');
            }

            /* Add the sign */
            if (this.negative) {
                result = `- ${result}`;
            }

            return result;
        } else if (base === 16) {
            // for (let i = 0; i < this.buf.length; i++) {
            // result = this.buf[i].toString(16).padStart(2, '0') + result;
            // }

            result = this.buf.toString('hex');

            let result2 = '';

            for (let i = 0; i < result.length; i += 2) {
                result2 = result.slice(i, i + 2) + result2;
            }

            result = result2;

            /* remove leading zeroes but only if the number is not zero */
            if (result !== '0') {
                result = result.replace(/^0+/, '');
            }

            /* Add the sign */
            if (this.negative) {
                result = `-${result}`;
            }

            return result;
        } else if (base === 64) {
            return this.buf.toString('base64');
        } else {
            /* Base n */
            let result = '';
            let temp = this.copy();

            const computed: string[] = [];

            while (!temp.isZero()) {
                const divmod = temp.divop(UnlimInt.fromNumber(base));

                // console.log(divmod);

                const key = `${temp.toString(2)};${divmod.quotient.toString(2)};${divmod.remainder.toString(2)}`;

                if (!computed.includes(key)) {
                    // console.log(key);
                    computed.push(key);
                } else {
                    console.log('Loop detected');
                }

                result = divmod.remainder.toNumber().toString(base) + result;
                temp = divmod.quotient;
            }

            if (this.negative) {
                result = `-${result}`;
            }

            return result === '' ? '0' : result;
        }
    }

    public copy(): UnlimInt {
        const result = new UnlimInt(this.size, this.negative);

        this.buf.copy(result.buf);

        return result;
    }

    public trimmedSize(): number {
        let result = this.size;

        for (let i = this.size - 1; i >= 0; i--) {
            if (this.getBit(i)) {
                break;
            }

            result--;
        }

        return result;
    }

    public ctrim(): UnlimInt {
        const size = this.trimmedSize();
        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < size; i++) {
            result.setBit(i, this.getBit(i));
        }

        return result;
    }

    public trim(): UnlimInt {
        const size = this.trimmedSize();

        if (size === this.size) {
            return this;
        }

        const buf = Buffer.alloc(Math.ceil(size / 8));

        this.buf.copy(buf);

        this.buf = buf;
        this.size = size;

        return this;
    }

    public ctrimTo(size: number): UnlimInt {
        const result = new UnlimInt(size, this.negative);

        // make result the same size as `size`
        for (let i = 0; i < size; i++) {
            result.setBit(i, this.getBit(i));
        }

        return result;
    }

    public trimTo(size: number): UnlimInt {
        if (size < this.size) {
            return this;
        }

        const trimmed = this.ctrimTo(size);

        this.buf = trimmed.buf;
        this.size = trimmed.size;

        return this;
    }

    public cexpand(size: number): UnlimInt {
        const result = new UnlimInt(size, this.negative);

        for (let i = 0; i < this.size; i++) {
            result.setBit(i, this.getBit(i));
        }

        return result;
    }

    public expand(size: number): UnlimInt {
        if (size < this.size) {
            return this;
        }

        const buf = Buffer.alloc(Math.ceil(size / 8));

        this.buf.copy(buf);

        this.buf = buf;
        this.size = size;

        return this;
    }

    public stringSize(base: number): number {
        if (base < 2 || base > 36) {
            throw new Error('Base must be between 2 and 36');
        }

        return Math.ceil(this.size * Math.log2(base));
    }

    static fromNumber(value: number): UnlimInt {
        const val = Math.floor(value);

        const size = Math.ceil(Math.log2(val + 1));

        const result = new UnlimInt(size, val < 0);

        const abs = Math.abs(val);

        for (let i = 0; i < size; i++) {
            result.setBit(i, (abs & (1 << i)) != 0);
        }

        return result;
    }

    static fromBigInt(value: bigint): UnlimInt {
        const size = 64;

        const result = new UnlimInt(size, value < BigInt(0));

        const abs = value < BigInt(0) ? -value : value;

        for (let i = 0; i < size; i++) {
            result.setBit(i, (abs & (BigInt(1) << BigInt(i))) != BigInt(0));
        }

        result.trim();

        return result;
    }

    static fromBuffer(value: Buffer, sign: boolean): UnlimInt {
        const result = new UnlimInt(value.length * 8, sign);

        for (let i = 0; i < value.length; i++) {
            for (let j = 0; j < 8; j++) {
                result.setBit(i * 8 + j, (value[i] & (1 << j)) != 0);
            }
        }

        return result;
    }

    static fromString(value: string, base: number): UnlimInt {
        if (base < 2 || base > 36) {
            throw new Error('Base must be between 2 and 36');
        }

        if (![2, 10, 16].includes(base)) {
            throw new Error('Only bases 2, 10 and 16 are supported currently');
        }

        const size = base === 2
            ? value.length
            : base === 10
                ? Math.ceil(value.length * Math.log2(base))
                : value.length * 4;

        let sign = false;
        let val = value;

        if (val.startsWith('-')) {
            sign = true;
            val = val.slice(1);
        }

        let result = new UnlimInt(size, sign);

        if (base === 2) {
            for (let i = val.length - 1; i >= 0; i--) {
                result.setBit(val.length - 1 - i, val[i] == '1');
            }

            return result;
        } else if (base === 10) {
            /* Base 10 */
            let result = UnlimInt.fromNumber(0);
            let multiplier = UnlimInt.fromNumber(1);

            for (let i = val.length - 1; i >= 0; i--) {
                const digit = parseInt(val[i], 10);

                if (isNaN(digit)) {
                    throw new Error(`Invalid digit ${val[i]} in string`);
                }

                const digitValue = UnlimInt.fromNumber(digit).mul(multiplier);

                result = result.add(digitValue);
                multiplier = multiplier.mul(UnlimInt.fromNumber(10));
            }

            /* Add the sign */
            if (sign) {
                result = UnlimInt.fromString(`-${result.toString(2)}`, 2);
            }

            return result;
        } else {
            for (let i = 0; i < val.length; i++) {
                /* Convert the character to a number */
                const num = parseInt(val[i], 16);

                /* Add the number to the result */
                for (let j = 0; j < 4; j++) {
                    const index = (val.length - 1 - i) * 4 + j;

                    result.setBit(index, (num & (1 << j)) != 0);
                }
            }

            /* Add leading zeroes */
            if (result.toString(2) == '') {
                result = UnlimInt.fromNumber(0);
            }

            /* remove leading zeroes but only if the number is not zero */
            if (result.toString(2) !== '0') {
                result = UnlimInt.fromString(result.toString(2), 2);
            }

            /* Add the sign */
            if (sign) {
                result = UnlimInt.fromString(`-${result.toString(2)}`, 2);
            }

            return result;
        }
    }

    static fromHex(value: string): UnlimInt {
        return UnlimInt.fromString(value, 16);
    }

    static fromDecimal(value: string): UnlimInt {
        return UnlimInt.fromString(value, 10);
    }

    static fromBinary(value: string): UnlimInt {
        return UnlimInt.fromString(value, 2);
    }

    static from(value: number | bigint | Buffer | string, base?: number): UnlimInt {
        if (typeof value === 'number') {
            return UnlimInt.fromNumber(value);
        } else if (typeof value === 'bigint') {
            return UnlimInt.fromBigInt(value);
        } else if (Buffer.isBuffer(value)) {
            return UnlimInt.fromBuffer(value, false);
        } else if (typeof value === 'string') {
            if (base) {
                return UnlimInt.fromString(value, base);
            } else if (value.startsWith('0x')) {
                return UnlimInt.fromHex(value.slice(2));
            } else if (value.startsWith('0b')) {
                return UnlimInt.fromBinary(value.slice(2));
            } else {
                return UnlimInt.fromDecimal(value);
            }
        } else {
            throw new Error('Invalid type');
        }
    }

    static calcSize(i1: UnlimInt, i2: UnlimInt, op: '+' | '-' | '*' | '/' | '%' | '^' | '&' | '|' | '~'): number {
        if (op == '+' || op == '-') {
            return Math.max(i1.trimmedSize(), i2.trimmedSize()) + 1;
        } else if (op == '*') {
            return i1.trimmedSize() + i2.trimmedSize();
        } else if (op == '/') {
            return i1.trimmedSize();
        } else if (op == '%') {
            return i2.trimmedSize();
        } else if (op == '^') {
            return i1.trimmedSize() * i2.trimmedSize();
        } else if (op == '&' || op == '|' || op == '~') {
            return Math.max(i1.trimmedSize(), i2.trimmedSize());
        } else {
            throw new Error('Invalid operator');
        }
    }
}
