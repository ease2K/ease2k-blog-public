import assert from 'node:assert/strict';
import { ratingColor, ratingLevels } from '../lib/rating-colors.mjs';
import { createRatingsProvider, parseRating, parseHistory } from '../lib/ratings.mjs';

const cf = rating => ({ status: 'OK', result: [
    { handle: 'ease2k', contestId: 1, contestName: 'First round', rank: 100, oldRating: 0, newRating: 1800, ratingUpdateTimeSeconds: 1750000000 },
    { handle: 'ease2k', contestId: 2, contestName: 'Second round', rank: 200, oldRating: 1800, newRating: rating, ratingUpdateTimeSeconds: 1760000000 },
] });
const atPoint = (rating, date, id) => ({ IsRated: true, OldRating: 1100, NewRating: rating, EndTime: date, ContestScreenName: id + '.contest.atcoder.jp', ContestName: id, ContestNameEn: id, Place: 100 });
const at = [
    atPoint(1400, '2026-05-01T12:00:00Z', 'abc450'),
    { IsRated: false, NewRating: 9000, EndTime: '2026-07-01T12:00:00Z' },
    atPoint(1234, '2026-06-01T12:00:00Z', 'abc460'),
];
assert.deepEqual(parseRating('atcoder', at), { rating: 1234, maxRating: 1400 });
assert.deepEqual(parseRating('atcoder', []), { rating: null, maxRating: null });
assert.throws(() => parseRating('codeforces', { status: 'FAILED' }));
assert.throws(() => parseRating('codeforces', { status: 'OK', result: [{ handle: 'other', rating: 1600, maxRating: 1800 }] }));
assert.throws(() => parseRating('atcoder', [{ IsRated: true, NewRating: '1234', EndTime: 'invalid' }]));
assert.deepEqual(parseRating('codeforces', { status: 'OK', result: [] }), { rating: null, maxRating: null });
assert.deepEqual(parseHistory('atcoder', [...at].reverse()).map(point => point.id), ['abc450', 'abc460']);
assert.equal(parseHistory('atcoder', at)[1].href, 'https://atcoder.jp/contests/abc460');
assert.equal(parseHistory('codeforces', cf(1630))[1].rating, 1630);
assert.throws(() => parseHistory('atcoder', [{ ...at[0], ContestScreenName: 'https://invalid.test/' }]));
let time = Date.parse('2026-10-29T00:00:00Z'), calls = 0, failed = false, cfRating = 1630;
const get = createRatingsProvider({ now: () => time, fetcher: async url => {
    calls++;
    await Promise.resolve();
    if (failed && url.includes('atcoder')) throw Error('offline');
    return { ok: true, json: async () => url.includes('codeforces') ? cf(cfRating) : at };
} });
const [first, concurrent] = await Promise.all([get(), get()]);
assert.equal(calls, 2);
assert.deepEqual(first, concurrent);
assert.equal(first.codeforces.stale, false);
assert.equal(first.atcoder.rating, 1234);
assert.equal(first.codeforces.history.length, 2);
assert.equal(first.atcoder.history.length, 2);
first.atcoder.history[0].name = 'mutated';
assert.equal((await get()).atcoder.history[0].name, 'abc450');
await get(); assert.equal(calls, 2);
time += 16 * 60 * 1000; failed = true; cfRating = 1700;
const partial = await get();
assert.equal(partial.codeforces.rating, 1700);
assert.equal(partial.codeforces.stale, false);
assert.equal(partial.atcoder.rating, 1234);
assert.equal(partial.atcoder.stale, true);
assert.equal(partial.atcoder.history.length, 2);
assert.equal(partial.atcoder.fetchedAt, first.atcoder.fetchedAt);
await get(); assert.equal(calls, 4);
time += 61 * 1000; failed = false;
assert.equal((await get()).atcoder.stale, false);
assert.equal(calls, 5);
const offline = createRatingsProvider({ fetcher: async () => { throw Error('offline'); } });
const fallback = await offline();
assert.equal(fallback.codeforces.stale, true);
assert.equal(typeof fallback.codeforces.rating, 'number');
console.log('Rating parsing, caching, concurrency, partial failures and recovery passed.');

for (const [rating, color] of [[1199, '#808080'], [1200, '#008000'], [1400, '#03A89E'], [1600, '#0000FF'], [1900, '#AA00AA'], [2100, '#FF8C00'], [2400, '#FF0000']]) assert.equal(ratingColor('codeforces', rating), color);
for (const [rating, color] of [[399, '#808080'], [400, '#804000'], [800, '#008000'], [1200, '#00C0C0'], [1600, '#0000FF'], [2000, '#C0C000'], [2400, '#FF8000'], [2800, '#FF0000'], [3200, '#FF0000']]) assert.equal(ratingColor('atcoder', rating), color);
assert.equal(ratingColor('codeforces', null), 'var(--muted)');
assert.equal(ratingColor('atcoder', null), 'var(--muted)');
assert.deepEqual(ratingLevels.codeforces.map(level => level.min), [0, 1200, 1400, 1600, 1900, 2100, 2400]);
assert.deepEqual(ratingLevels.atcoder.map(level => level.min), [0, 400, 800, 1200, 1600, 2000, 2400, 2800]);
for (const [platform, levels] of Object.entries(ratingLevels)) for (const level of levels) assert.equal(ratingColor(platform, level.min), level.color);
console.log('Official rating color thresholds passed.');
