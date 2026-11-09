import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['app/scholarship-app.tsx','app/page.tsx','app/layout.tsx','app/api/[...path]/route.ts','db/schema.ts','lib/catalog.mjs','lib/domain.mjs','lib/partner.mjs','lib/service.mjs','tests/api.test.mjs','scripts/setup-local.mjs'];
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
for(const file of files){const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:file.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);writeFileSync(file,printer.printFile(source));}
