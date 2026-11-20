/**
 * Lightweight, zero-dependency syntax highlighter for TypeScript, JavaScript,
 * Prisma schema, PostgreSQL SQL, MongoDB BSON, and JSON output.
 */
export function highlightCodeHtml(code: string, lang: 'ts' | 'js' | 'sql' | 'prisma' | 'json' = 'ts'): string {
  if (!code) return '';

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  if (lang === 'json') {
    const escaped = escapeHtml(code);
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            const keyPart = match.replace(/:$/, '');
            return `<span class="hl-json-key">${keyPart}</span>:`;
          }
          return `<span class="hl-str">${match}</span>`;
        }
        if (/true|false/.test(match)) {
          return `<span class="hl-bool">${match}</span>`;
        }
        if (/null/.test(match)) {
          return `<span class="hl-null">${match}</span>`;
        }
        return `<span class="hl-num">${match}</span>`;
      },
    );
  }

  // Tokenize comments and strings first so inner keywords aren't highlighted
  const tokens: string[] = [];
  const pushToken = (html: string) => {
    const id = tokens.length;
    tokens.push(html);
    return `@@TOK_${id}@@`;
  };

  let work = escapeHtml(code);

  // 1. Line comments (// ... or -- ...)
  work = work.replace(/(\/\/[^\n]*|--[^\n]*)/g, (m) =>
    pushToken(`<span class="hl-comment">${m}</span>`),
  );

  // 2. Strings ('...', "...", `...`)
  work = work.replace(/('[^'\n]*'|"[^"\n]*"|`[^`]*`)/g, (m) =>
    pushToken(`<span class="hl-str">${m}</span>`),
  );

  // 3. Decorators & Prisma attributes (@Controller, @@index, @id, @default, $inc, $set, etc.)
  work = work.replace(/(@@?[a-zA-Z_][a-zA-Z0-9_]*|\$[a-zA-Z_][a-zA-Z0-9_]*)/g, (m) =>
    pushToken(`<span class="hl-dec">${m}</span>`),
  );

  // 4. SQL keywords if SQL
  if (lang === 'sql') {
    work = work.replace(
      /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|LEFT|INNER|ON|ORDER|BY|ASC|DESC|LIMIT|OFFSET|GROUP|HAVING|CREATE|TABLE|INDEX|UNIQUE|PRIMARY|KEY|FOREIGN|REFERENCES|ON|CASCADE|RESTRICT|BEGIN|COMMIT|ROLLBACK|AS|AND|OR|NOT|NULL|DEFAULT|SERIAL|INTEGER|TEXT|VARCHAR|BOOLEAN|TIMESTAMPTZ|NUMERIC|JSONB|CONFLICT|DO|RETURNING)\b/g,
      '<span class="hl-kw">$1</span>',
    );
  } else {
    // 5. TS / JS / Prisma keywords
    work = work.replace(
      /\b(import|from|export|class|interface|type|enum|model|datasource|generator|extends|implements|constructor|private|public|protected|readonly|async|await|return|const|let|var|if|else|for|of|in|try|catch|finally|throw|new|this|true|false|null|undefined|void|typeof|instanceof)\b/g,
      '<span class="hl-kw">$1</span>',
    );

    // 6. Common NestJS / TS types & classes
    work = work.replace(
      /\b(string|number|boolean|any|Promise|Observable|Record|Array|Partial|Map|Set|Date|ObjectId|Types|Model|Connection|PrismaService|DatabaseService|NotFoundException|BadRequestException|UnauthorizedException|ForbiddenException|ConflictException|UnprocessableEntityException|ValidationPipe|ParseIntPipe|Reflector|ExecutionContext|CallHandler)\b/g,
      '<span class="hl-type">$1</span>',
    );
  }

  // 7. Numbers
  work = work.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-num">$1</span>');

  // Restore tokens
  work = work.replace(/@@TOK_(\d+)@@/g, (_m, idx) => tokens[Number(idx)] || '');

  return work;
}
