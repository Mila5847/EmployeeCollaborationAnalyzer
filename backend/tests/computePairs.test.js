import { Readable } from 'stream';
import { computePairs } from '../computePairs.js';

describe('computePairs', () => {

  const toStream = (content) => Readable.from([content]);
  const DAY_MS = 1000 * 60 * 60 * 24;

  test('returns correct pair for 3-record sample', async () => {
    const csv = `
    143,10,2023-01-01,2023-01-05
    218,10,2023-01-03,2023-01-10
    999,20,2023-02-01,2023-02-10
    `.trim();

    const { top, pairs, errors } = await computePairs(toStream(csv));

    expect(errors).toHaveLength(0);
    expect(pairs).toHaveLength(1);
    expect([top.empA, top.empB].sort()).toEqual([143, 218]);
    expect(top.totalDays).toBe(3); // Overlapping days between Jan 3 and Jan 5
  });

  test('collects errors for bad date but still returns valid result', async () => {
    const csv = `
    143,10,2023-01-01,2023-01-05
    218,10,BAD-DATE,2023-01-10
    `.trim();

    const { pairs, top, errors } = await computePairs(toStream(csv));

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('BadDate');
    expect(errors[0].message).toMatch(/Bad date/i);
    expect(pairs).toHaveLength(0);
    expect(top).toBeNull();
  });

  test('returns empty result and no errors for empty CSV', async () => {
    const { pairs, top, errors } = await computePairs(toStream(''));

    expect(errors).toHaveLength(0);
    expect(pairs).toHaveLength(0);
    expect(top).toBeNull();
  });

  test('collects malformed rows gracefully', async () => {
    const csv = `
    143,10,2023-01-01
    218,10,2023-01-03,2023-01-10
    `.trim();

    const { errors, pairs, top } = await computePairs(toStream(csv));

    expect(errors.some(e => e.type === 'malformed_row')).toBe(true);
    expect(pairs).toHaveLength(0);
    expect(top).toBeNull();
  });

  test('handles a completely broken stream', async () => {
    const brokenStream = new Readable({
      read() {
        // do nothing, stays idle
      }
    });
  
    const promise = computePairs(brokenStream);
  
    // emit error safely in the next tick of the event loop after listeners are definitely attached
    process.nextTick(() => brokenStream.emit('error', new Error('Simulated stream error')));
  
    const result = await promise;
  
    expect(result.errors.some(e => e.type === 'stream_error')).toBe(true);
    expect(result.pairs).toHaveLength(0);
    expect(result.top).toBeNull();
  });  

  test('employees working on non-overlapping periods', async () => {
    const csv = `
    143,10,2023-01-01,2023-01-10
    218,10,2023-02-01,2023-02-10
    `.trim();

    const { top, pairs, errors } = await computePairs(toStream(csv));

    expect(errors).toHaveLength(0);
    expect(pairs).toHaveLength(0);
    expect(top).toBeNull();
  });

  test('supports multiple date formats in input', async () => {
    const csv = `
    143,10,01/01/2023,2023-01-10
    218,10,5-Jan-2023,10/01/2023
    `.trim();

    const { top, pairs, errors } = await computePairs(toStream(csv));

    expect(errors).toHaveLength(0);
    expect(pairs).toHaveLength(1);
    expect([top.empA, top.empB].sort()).toEqual([143, 218]);
    expect(top.totalDays).toBe(6); // Overlap from Jan 5 to Jan 10
});

test('handles NULL as today', async () => {
    // Fix today's date for test predictability
    const fixedToday = new Date('2023-12-31');
    
    const csv = `
    143,10,2023-12-01,NULL
    218,10,2023-12-15,NULL
    `.trim();

    // Call computePairs with explicit 'today'
    const { pairs, top, errors } = await computePairs(toStream(csv), fixedToday);

    expect(errors).toHaveLength(0);
    expect(pairs).toHaveLength(1);

    // Overlap is from 2023-12-15 to 2023-12-31 inclusive => 17 days
    expect(top.totalDays).toBe(17);
    expect([top.empA, top.empB].sort()).toEqual([143, 218]);
});

test('multiple pairs tie on overlap days', async () => {
    const csv = `
    143,10,2023-01-01,2023-01-10
    218,10,2023-01-01,2023-01-10
    333,20,2023-01-01,2023-01-10
    444,20,2023-01-01,2023-01-10
    `.trim();

    const { top, pairs, errors } = await computePairs(toStream(csv));

    expect(pairs).toHaveLength(2);
    expect(pairs[0].totalDays).toBe(10);
    expect(pairs[1].totalDays).toBe(10);

});

test('same employees on multiple projects', async () => {
    const csv = `
    143,10,2023-01-01,2023-01-05
    143,20,2023-02-01,2023-02-05
    218,10,2023-01-03,2023-01-07
    218,20,2023-02-03,2023-02-07
    `.trim();

    const { top, pairs, errors } = await computePairs(toStream(csv));

    expect(pairs).toHaveLength(1);
    expect(top.projects).toHaveLength(2);
    expect(top.totalDays).toBe(6); // 3 days in Jan + 3 days in Feb


});

test('weird null formats', async () => {
    const csv = `
    143,10,2023-01-01, NULL 
    218,10,2023-06-01, null
    333,10,2023-03-01,   NULL
    `.trim();
    
    const { pairs, errors } = await computePairs(toStream(csv));
    expect(errors).toHaveLength(0);
});
  
});
