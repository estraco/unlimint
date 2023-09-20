import ProgressBar from 'ezpb';
import UnlimInt from '..';
import crypto from 'crypto';
import { hrtime } from 'process';

const BIT_COUNT = 512;
const LOOP_COUNT = 0xffff;

function bitcountTest() {
    console.log(`Bitcount test ${BIT_COUNT} bits, ${LOOP_COUNT} iterations.`);

    const largest = UnlimInt.fromNumber(2).pow(BIT_COUNT).sub(1);

    console.log(`Largest number possible: ${largest.toString(10)}`);

    const bar = new ProgressBar(`${LOOP_COUNT} iterations`, LOOP_COUNT);

    bar.setRefreshMethod('event');

    let c = 0;

    const startTotal = hrtime.bigint();

    let total = BigInt(0);

    for (let i = 0; i < LOOP_COUNT; i++) {
        const n1 = UnlimInt.fromHex(crypto.randomBytes(BIT_COUNT / 8).toString('hex'));
        const n2 = UnlimInt.fromHex(crypto.randomBytes(BIT_COUNT / 8).toString('hex'));

        const start = hrtime.bigint();

        n1.div(n2);

        const end = hrtime.bigint();

        total += end - start;

        bar.update(++c);
    }

    const endTotal = hrtime.bigint();

    console.log();

    // hrtimes are in nanoseconds, so divide by 1_000_000 to get milliseconds

    console.log(`Total time: ${endTotal - startTotal}ns (${(endTotal - startTotal) / BigInt(1_000_000)}ms)`);

    return {
        total: endTotal - startTotal,
        totalMs: Number(endTotal - startTotal) / 1_000_000,
        avg: total / BigInt(LOOP_COUNT),
        avgMs: Number(total / BigInt(LOOP_COUNT)) / 1_000_000
    };
}

if (require.main === module) {
    console.log('Running bitcount test with cache disabled...');

    UnlimInt.disableCache();

    const noCache = bitcountTest();

    console.log('Test with cache disabled:');
    console.log(`    Total time: ${noCache.totalMs}ms`);
    console.log(`    Average time per iteration: ${noCache.avg}ns (${noCache.avgMs}ms)`);

    console.log('Enabling cache...');

    UnlimInt.enableCache(1_000_000);

    console.log('Running bitcount test with cache enabled...');

    const cache = bitcountTest();

    console.log('Test with cache enabled:');
    console.log(`    Total time: ${cache.totalMs}ms`);
    console.log(`    Average time per iteration: ${cache.avg}ns (${cache.avgMs}ms)`);

    console.log('Cache stats:');

    const stats = UnlimInt.cacheStats();

    console.log(`    Hits: ${stats.hit}`);
    console.log(`    Misses: ${stats.miss}`);
    console.log(`    Hit rate: ${stats.hitRate}%`);
    console.log(`    Cache size: ${stats.size}`);
}
