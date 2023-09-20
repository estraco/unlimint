import UnlimInt from '..';

export default function generalTest() {
    const b2str = Array.from({ length: 128 }).map(() => Math.floor(Math.random() * 2)).join('').replace(/^0+/, '');
    const b10str = Array.from({ length: 50 }).map(() => Math.floor(Math.random() * 10)).join('').replace(/^0+/, '');
    const b16str = Array.from({ length: 16 }).map(() => Math.floor(Math.random() * 16).toString(16)).join('').replace(/^0+/, '');

    const a = UnlimInt.fromNumber(5);
    const b = UnlimInt.fromBigInt(BigInt(3));
    const c = UnlimInt.fromString(b2str, 2);
    const d = UnlimInt.fromString(b10str, 10);
    const e = UnlimInt.fromString(b16str, 16);

    // check that all.toString() methods work
    console.log(a.toString(2), a.toString(10), a.toString(16));
    console.log(b.toString(2), b.toString(10), b.toString(16));
    console.log(`b2str: ${b2str}`);
    console.log(c.toString(2), c.toString(10), c.toString(16));
    console.log(`b10str: ${b10str}`);
    console.log(d.toString(2), d.toString(10), d.toString(16));
    console.log(`b16str: ${b16str}`);
    console.log(e.toString(2), e.toString(10), e.toString(16));

    console.log(`${a.toNumber()}.add(${b.toNumber()})`, a.cadd(b).toNumber(), `${a.toNumber()}.add(${b.toNumber()}) === 5.cadd(3) === 8`);
    console.log(`${a.toNumber()}.sub(${b.toNumber()})`, a.csub(b).toNumber(), `${a.toNumber()}.sub(${b.toNumber()}) === 5.csub(3) === 2`);
    console.log(`${a.toNumber()}.mul(${b.toNumber()})`, a.cmul(b).toNumber(), `${a.toNumber()}.mul(${b.toNumber()}) === 5.cmul(3) === 15`);
    console.log(`${a.toNumber()}.div(${b.toNumber()})`, a.div(b).toNumber(), `${a.toNumber()}.div(${b.toNumber()}) === 5.div(3) === 1`);
    console.log(`${a.toNumber()}.mod(${b.toNumber()})`, a.mod(b).toNumber(), `${a.toNumber()}.mod(${b.toNumber()}) === 5.mod(3) === 2`);

    console.log(c.toString(2), c.toString(2) === b2str);

    console.log(d.toString(10), d.toString(10) === b10str);

    console.log(e.toString(16), e.toString(16) === b16str);
}

if (require.main === module) {
    generalTest();
}
