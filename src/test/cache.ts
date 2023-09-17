import UnlimInt from '..';
import crypto from 'crypto';

export default function cacheTest() {
    const hex = crypto.randomBytes(24).toString('hex');

    UnlimInt.disableCache();

    for (let i = 0; i < 0xff; i++) {
        const a = UnlimInt.fromString(hex, 16);

        const start = Date.now();

        a.toString(10);
        const end = Date.now();

        console.log(`Time: ${end - start}ms; (0x${i.toString(16)} / 0xff)`);
    }

    console.log();
    console.log(`Cache stats: ${JSON.stringify(UnlimInt.cacheStats(), null, 4)}`);

    UnlimInt.enableCache(-1);

    for (let i = 0; i < 0xff; i++) {
        const a = UnlimInt.fromString(hex, 16);

        const start = Date.now();

        a.toString(10);
        const end = Date.now();

        console.log(`Time: ${end - start}ms; (0x${i.toString(16)} / 0xff)`);
    }

    console.log();
    console.log(`Cache stats: ${JSON.stringify(UnlimInt.cacheStats(), null, 4)}`);
}
