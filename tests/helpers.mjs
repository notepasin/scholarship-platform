import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function database() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys=ON');
    for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
    const db = { prepare(sql) { let args = []; return { bind(...a) { args = a; return this; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { return { meta: sqlite.prepare(sql).run(...args) }; } }; }, async batch(statements) { sqlite.exec('BEGIN'); try {
            const r = [];
            for (const s of statements)
                r.push(await s.run());
            sqlite.exec('COMMIT');
            return r;
        }
        catch (e) {
            sqlite.exec('ROLLBACK');
            throw e;
        } } };
    return { db, sqlite };
}
