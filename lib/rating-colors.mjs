// Official color boundaries are shared by scores, dots and chart guide lines.
export const ratingLevels = {
    codeforces: [
        { min: 0, color: '#808080' }, { min: 1200, color: '#008000' },
        { min: 1400, color: '#03A89E' }, { min: 1600, color: '#0000FF' },
        { min: 1900, color: '#AA00AA' }, { min: 2100, color: '#FF8C00' },
        { min: 2400, color: '#FF0000' },
    ],
    atcoder: [
        { min: 0, color: '#808080' }, { min: 400, color: '#804000' },
        { min: 800, color: '#008000' }, { min: 1200, color: '#00C0C0' },
        { min: 1600, color: '#0000FF' }, { min: 2000, color: '#C0C000' },
        { min: 2400, color: '#FF8000' }, { min: 2800, color: '#FF0000' },
    ],
};
export function ratingColor(platform, rating) {
    if (rating === null) return 'var(--muted)';
    const levels = ratingLevels[platform === 'codeforces' ? 'codeforces' : 'atcoder'];
    return levels.filter(level => rating >= level.min).at(-1)?.color || levels[0].color;
}
