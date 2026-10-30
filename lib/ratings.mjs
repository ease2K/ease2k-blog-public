import snapshot from './ratings-snapshot.json' with { type: 'json' };

const sources = {
    codeforces: 'https://codeforces.com/api/user.rating?handle=ease2k',
    atcoder: 'https://atcoder.jp/users/ease2k/history/json',
};
const score = value => Number.isInteger(value) && value >= 0;
export function parseHistory(platform, value) {
    if (platform === 'codeforces') {
        if (value?.status !== 'OK' || !Array.isArray(value.result)) throw Error('Invalid Codeforces response');
        return value.result.map(item => {
            if (item.handle?.toLowerCase() !== 'ease2k' || !score(item.newRating) || !score(item.oldRating) || !Number.isInteger(item.contestId) || item.contestId <= 0 || typeof item.contestName !== 'string' || !item.contestName.trim() || !Number.isInteger(item.rank) || item.rank <= 0 || !Number.isFinite(item.ratingUpdateTimeSeconds) || !Number.isFinite(new Date(item.ratingUpdateTimeSeconds * 1000).getTime())) throw Error('Invalid Codeforces history');
            return { id: String(item.contestId), name: item.contestName, date: new Date(item.ratingUpdateTimeSeconds * 1000).toISOString(), oldRating: item.oldRating, rating: item.newRating, rank: item.rank, href: 'https://codeforces.com/contest/' + item.contestId };
        }).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (!Array.isArray(value)) throw Error('Invalid AtCoder response');
    const rated = value.filter(item => item.IsRated === true);
    return rated.map(item => {
        const id = typeof item.ContestScreenName === 'string' ? item.ContestScreenName.replace(/\.contest\.atcoder\.jp$/, '') : '';
        if (!score(item.NewRating) || !score(item.OldRating) || !Number.isFinite(Date.parse(item.EndTime)) || !/^[a-z0-9_-]+$/i.test(id) || typeof item.ContestName !== 'string' || !item.ContestName.trim() || !Number.isInteger(item.Place) || item.Place <= 0) throw Error('Invalid AtCoder history');
        return { id, name: item.ContestName, enName: item.ContestNameEn || item.ContestName, date: new Date(item.EndTime).toISOString(), oldRating: item.OldRating, rating: item.NewRating, rank: item.Place, href: 'https://atcoder.jp/contests/' + id };
    }).sort((a, b) => a.date.localeCompare(b.date));
}
export function parseRating(platform, value) {
    const history = parseHistory(platform, value);
    return { rating: history.at(-1)?.rating ?? null, maxRating: history.length ? Math.max(...history.map(item => item.rating)) : null };
}

// Each upstream is cached independently; failures retain the last verified value.
export function createRatingsProvider({ fetcher = fetch, now = Date.now, seed = snapshot } = {}) {
    const state = Object.fromEntries(Object.keys(sources).map(platform => [platform, {
        value: { ...seed[platform], history: seed[platform].history || [], stale: true }, nextCheck: 0, pending: null,
    }]));
    async function refresh(platform) {
        const item = state[platform];
        if (item.pending) return item.pending;
        if (now() < item.nextCheck) return;
        item.pending = Promise.resolve().then(async () => {
            try {
                const response = await fetcher(sources[platform], { signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
                if (!response.ok) throw Error('Rating source unavailable');
                const history = parseHistory(platform, await response.json());
                const rating = history.at(-1)?.rating ?? null, maxRating = history.length ? Math.max(...history.map(point => point.rating)) : null;
                item.value = { rating, maxRating, history, fetchedAt: new Date(now()).toISOString(), stale: false };
                item.nextCheck = now() + 15 * 60 * 1000;
            } catch {
                item.value = { ...item.value, stale: true };
                item.nextCheck = now() + 60 * 1000;
            } finally { item.pending = null; }
        });
        return item.pending;
    }
    return async () => {
        await Promise.all(Object.keys(sources).map(refresh));
        return Object.fromEntries(Object.entries(state).map(([key, item]) => [key, { ...item.value, history: item.value.history.map(point => ({ ...point })) }]));
    };
}
export const getRatings = createRatingsProvider();
