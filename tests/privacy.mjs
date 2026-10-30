import assert from 'node:assert/strict';
const origin = process.env.BLOG_TEST_ORIGIN || 'http://127.0.0.1:5173';
const login = await fetch(origin + '/signin-with-chatgpt?return_to=/daily', { redirect: 'manual' });
const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
assert.ok(cookie, 'Local preview login must return a cookie');
const ownerHeaders = { cookie, origin, 'Content-Type': 'application/json' };
const ids = [];
const payload = async (headers = {}, suffix = '') => (await fetch(origin + '/api/blog' + suffix, { headers })).json();
try {
    const owner = await payload({ cookie });
    assert.equal(owner.ready, true, 'Database must be ready');
    assert.equal(owner.owner, true, 'Local preview identity must be owner');
    for (const visibility of ['private', 'public']) {
        const response = await fetch(origin + '/api/blog', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ title: 'QA temporary ' + visibility, body: 'Disposable local test content ' + visibility, visibility }) });
        assert.equal(response.status, 200);
        ids.push((await response.json()).id);
    }
    const anonymous = await payload();
    assert.equal(anonymous.entries.some(e => e.id === ids[0]), false, 'Anonymous cannot receive private body');
    assert.equal(anonymous.entries.some(e => e.id === ids[1]), true, 'Anonymous can read public record');
    assert.equal(anonymous.owner, false);
    assert.equal((await payload({ cookie })).entries.some(e => e.id === ids[0]), true, 'Owner sees private record');
    assert.equal((await payload({ cookie }, '?visitor=1')).entries.some(e => e.id === ids[0]), false, 'Visitor preview excludes private record');
    assert.equal((await fetch(origin + '/api/blog', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'unauthorized' }) })).status, 403);
    assert.equal((await fetch(origin + '/api/blog', { method: 'POST', headers: { ...ownerHeaders, origin: 'https://different.example' }, body: JSON.stringify({ body: 'invalid origin' }) })).status, 403);
    const edit = await fetch(origin + '/api/blog', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ id: ids[1], title: 'QA temporary public', body: 'Changed to private', visibility: 'private' }) });
    assert.equal(edit.status, 200);
    assert.equal((await payload()).entries.some(e => e.id === ids[1]), false, 'Visibility changes apply immediately');
    assert.equal((await fetch(origin + '/api/blog', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ body: '   ' }) })).status, 400);
    const cache = await fetch(origin + '/api/blog', { headers: { cookie } });
    assert.ok(cache.headers.get('cache-control').includes('no-store'));
    console.log('PASS: owner persistence, public/private reads, visitor view, anonymous write denial, origin checks, visibility edit, empty body validation, private cache policy.');
} finally {
    for (const id of ids) {
        const response = await fetch(origin + '/api/blog?id=' + encodeURIComponent(id), { method: 'DELETE', headers: ownerHeaders });
        assert.equal(response.status, 200, 'Temporary test note cleanup');
    }
}
