import UnlimInt, { NumBase } from '..';
import crypto from 'crypto';
import { hrtime } from 'process';

import ProgressBar from 'ezpb';

const MAX_BIT_COUNT = 128;
const LOOP_COUNT = 4;

const MIN_TOSTRING_BASE = 3;
const MAX_TOSTRING_BASE = 3;

const FOR_PLOT = false;

export default function speedTest() {
    UnlimInt.disableCache();

    const maxNum = UnlimInt.fromNumber(2).pow(UnlimInt.from(MAX_BIT_COUNT)).sub(UnlimInt.fromNumber(1)).toString(10);

    for (let TOSTRING_BASE = MIN_TOSTRING_BASE; TOSTRING_BASE <= MAX_TOSTRING_BASE; TOSTRING_BASE++) {
        const start1 = Date.now();

        if (!FOR_PLOT) {
            console.log(`Base: ${TOSTRING_BASE}, loop count: ${LOOP_COUNT}, max bit count: ${MAX_BIT_COUNT}, total iterations: ${LOOP_COUNT * MAX_BIT_COUNT}`);
            console.log(`Numbers ranging from 0 to ${maxNum} in base ${TOSTRING_BASE}`);
            console.log();
        }

        const bar1 = new ProgressBar(`${LOOP_COUNT * MAX_BIT_COUNT} iterations (UNCACHED)`, LOOP_COUNT * MAX_BIT_COUNT);

        FOR_PLOT || bar1.setRefreshMethod('event');

        let c = 0;

        for (let size = 1; size <= MAX_BIT_COUNT; size++) {
            for (let i = 0; i < LOOP_COUNT; i++) {
                const hex = crypto.randomBytes(size / 8).toString('hex');

                const a = UnlimInt.fromString(hex, 16).trimTo(size);

                const start = hrtime.bigint();

                a.toString(TOSTRING_BASE as NumBase);

                const end = hrtime.bigint();

                FOR_PLOT && console.log(JSON.stringify({
                    size,
                    base: TOSTRING_BASE,
                    time: (end - start).toString(),
                    cached: false
                }));

                FOR_PLOT || bar1.update(++c);
            }
        }

        const end1 = Date.now();

        UnlimInt.enableCache(-1);

        if (!FOR_PLOT) {
            console.log();
        }

        const bar2 = new ProgressBar(`${LOOP_COUNT * MAX_BIT_COUNT} iterations (CACHED)`, LOOP_COUNT * MAX_BIT_COUNT);

        FOR_PLOT || bar2.setRefreshMethod('event');

        const start2 = Date.now();

        c = 0;

        for (let size = 1; size <= MAX_BIT_COUNT; size++) {
            for (let i = 0; i < LOOP_COUNT; i++) {
                const hex = crypto.randomBytes(size / 8).toString('hex');

                const a = UnlimInt.fromString(hex, 16).trimTo(size);

                const start = hrtime.bigint();

                a.toString(TOSTRING_BASE as NumBase);

                const end = hrtime.bigint();

                FOR_PLOT && console.log(JSON.stringify({
                    size,
                    base: TOSTRING_BASE,
                    time: (end - start).toString(),
                    cached: true
                }));

                FOR_PLOT || bar2.update(++c);
            }
        }

        const end2 = Date.now();

        if (!FOR_PLOT) {
            console.log();

            console.log(`Total time without cache: ${end1 - start1}ms`);
            console.log(`Average time without cache: ${(end1 - start1) / (LOOP_COUNT * MAX_BIT_COUNT)}ms`);
            console.log(`Total time with cache: ${end2 - start2}ms`);
            console.log(`Average time with cache: ${(end2 - start2) / (LOOP_COUNT * MAX_BIT_COUNT)}ms`);

            console.log(`Difference in time: ${(end1 - start1) - (end2 - start2)}ms`);
            console.log(`Average difference in time: ${((end1 - start1) - (end2 - start2)) / (LOOP_COUNT * MAX_BIT_COUNT)}ms`);
            console.log(`Difference in percentage: ${((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100}% `);

            // log memory usage
            const used = process.memoryUsage();

            for (const key in used) {
                // @ts-expect-error - ignore
                console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
            }

            // log cache stats
            const cacheStats = UnlimInt.cacheStats();

            console.log(`Cache stats: ${cacheStats.hit} hits, ${cacheStats.miss} misses, ${cacheStats.size} size, ${cacheStats.maxSize} max size`);
            console.log(`Cache hit rate: ${cacheStats.hitRate}% `);

            console.log();
            console.log('----------------------------------------');
            console.log();
        }

        UnlimInt.disableCache();
    }
}

if (require.main === module) {
    speedTest();
}
