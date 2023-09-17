import UnlimInt, { NumBase } from '..';
import crypto from 'crypto';

const MAX_BIT_COUNT = 192;
const LOOP_COUNT = 1;

const MAX_TOSTRING_BASE = 16;

export default function speedTest() {
    for (let TOSTRING_BASE = 2; TOSTRING_BASE <= MAX_TOSTRING_BASE; TOSTRING_BASE++) {
        const start1 = Date.now();

        console.log(`Base: ${TOSTRING_BASE}`);
        console.log();

        UnlimInt.disableCache();

        for (let size = 1; size < MAX_BIT_COUNT; size++) {
            for (let i = 0; i < LOOP_COUNT; i++) {
                const hex = crypto.randomBytes(size / 8).toString('hex');

                const a = UnlimInt.fromString(hex, 16).trimTo(size);

                a.toString(TOSTRING_BASE as NumBase);
            }
        }

        const end1 = Date.now();

        UnlimInt.enableCache(-1);

        const start2 = Date.now();

        for (let size = 1; size < MAX_BIT_COUNT; size++) {
            for (let i = 0; i < LOOP_COUNT; i++) {
                const hex = crypto.randomBytes(size / 8).toString('hex');

                const a = UnlimInt.fromString(hex, 16).trimTo(size);

                a.toString(TOSTRING_BASE as NumBase);
            }
        }

        const end2 = Date.now();

        console.log(`Total time without cache: ${end1 - start1}ms`);
        console.log(`Total time with cache: ${end2 - start2}ms`);

        console.log(`Difference in time: ${(end1 - start1) - (end2 - start2)}`);
        console.log(`Difference in percentage: ${((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100}%`);

        // log memory usage
        const used = process.memoryUsage();

        for (const key in used) {
            // @ts-expect-error - ignore
            console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
        }

        // log cache stats
        const cacheStats = UnlimInt.cacheStats();

        console.log(`Cache stats: ${cacheStats.hit} hits, ${cacheStats.miss} misses, ${cacheStats.size} size, ${cacheStats.maxSize} max size`);
        console.log(`Cache hit rate: ${cacheStats.hit / (cacheStats.hit + cacheStats.miss) * 100}%`);

        console.log();
        console.log('----------------------------------------');
    }
}
