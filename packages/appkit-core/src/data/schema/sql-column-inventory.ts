/** Limited PostgreSQL CREATE/ADD COLUMN inventory, not a migration interpreter. */
type Token = { value: string; kind: 'word' | 'quoted' | 'symbol' | 'literal' };

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < sql.length; ) {
    if (/\s/.test(sql[i])) {
      i++;
      continue;
    }
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i + 2);
      i = end < 0 ? sql.length : end + 1;
      continue;
    }
    if (sql.startsWith('/*', i)) {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth) {
        if (sql.startsWith('/*', i)) {
          depth++;
          i += 2;
        } else if (sql.startsWith('*/', i)) {
          depth--;
          i += 2;
        } else i++;
      }
      if (depth) throw new Error('Unterminated SQL comment');
      continue;
    }
    const dollar = sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
    if (dollar) {
      const end = sql.indexOf(dollar, i + dollar.length);
      if (end < 0) throw new Error('Unterminated SQL dollar string');
      tokens.push({ value: '', kind: 'literal' });
      i = end + dollar.length;
      continue;
    }
    if (sql[i] === '"' || sql[i] === "'") {
      const escaped =
        sql[i] === "'" && /[eE]/.test(sql[i - 1] ?? '') && !/[A-Za-z_0-9$]/.test(sql[i - 2] ?? '');
      const quote = sql[i++];
      let value = '';
      let closed = false;
      while (i < sql.length) {
        if (escaped && sql[i] === '\\') {
          value += sql[i + 1] ?? '';
          i += 2;
        } else if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            value += quote;
            i += 2;
          } else {
            i++;
            closed = true;
            break;
          }
        } else value += sql[i++];
      }
      if (!closed) throw new Error('Unterminated SQL quoted value');
      tokens.push({ value, kind: quote === '"' ? 'quoted' : 'literal' });
      continue;
    }
    const word = sql.slice(i).match(/^[A-Za-z_][A-Za-z_0-9$]*/)?.[0];
    if (word) {
      tokens.push({ value: word.toLowerCase(), kind: 'word' });
      i += word.length;
    } else tokens.push({ value: sql[i++], kind: 'symbol' });
  }
  return tokens;
}

const isWord = (token: Token | undefined, value: string) =>
  token?.kind === 'word' && token.value === value;
const isIdentifier = (token: Token | undefined) =>
  token?.kind === 'word' || token?.kind === 'quoted';
const isSymbol = (token: Token | undefined, value: string) =>
  token?.kind === 'symbol' && token.value === value;

/** Only public or unqualified tables; comments and literals never become DDL. */
export function collectSqlColumns(sql: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const statements: Token[][] = [[]];
  for (const token of tokenize(sql)) {
    if (isSymbol(token, ';')) statements.push([]);
    else statements[statements.length - 1].push(token);
  }
  for (const tokens of statements) {
    const create = isWord(tokens[0], 'create');
    const alter = isWord(tokens[0], 'alter');
    if ((!create && !alter) || !isWord(tokens[1], 'table')) continue;
    let i = 2;
    if (
      create &&
      isWord(tokens[i], 'if') &&
      isWord(tokens[i + 1], 'not') &&
      isWord(tokens[i + 2], 'exists')
    )
      i += 3;
    if (alter && isWord(tokens[i], 'only')) i++;
    if (!isIdentifier(tokens[i])) continue;
    let name = tokens[i++].value;
    if (isSymbol(tokens[i], '.')) {
      if (name !== 'public' || !isIdentifier(tokens[i + 1])) continue;
      name = tokens[i + 1].value;
      i += 2;
    }
    if (create) {
      if (!isSymbol(tokens[i++], '(')) continue;
      const columns = new Set<string>();
      let depth = 1;
      let start = true;
      for (; i < tokens.length && depth; i++) {
        const token = tokens[i];
        if (isSymbol(token, '(')) depth++;
        else if (isSymbol(token, ')')) depth--;
        else if (depth === 1 && isSymbol(token, ',')) {
          start = true;
          continue;
        } else if (
          depth === 1 &&
          start &&
          isIdentifier(token) &&
          !(
            token.kind === 'word' &&
            ['constraint', 'primary', 'unique', 'check', 'foreign', 'exclude', 'like'].includes(
              token.value,
            )
          )
        ) {
          columns.add(token.value);
        }
        start = false;
      }
      if (depth !== 0) throw new Error(`Unbalanced CREATE TABLE: ${name}`);
      tables.set(name, columns);
    } else {
      // ALTER TABLE can contain several comma-separated actions. Commas inside
      // type arguments, expressions, constraints or literals are not separators.
      const actions: Token[][] = [[]];
      let depth = 0;
      for (; i < tokens.length; i++) {
        const token = tokens[i];
        if (isSymbol(token, '(')) depth++;
        else if (isSymbol(token, ')')) depth--;
        if (depth < 0) throw new Error(`Unbalanced ALTER TABLE: ${name}`);
        if (depth === 0 && isSymbol(token, ',')) actions.push([]);
        else actions[actions.length - 1].push(token);
      }
      if (depth !== 0) throw new Error(`Unbalanced ALTER TABLE: ${name}`);
      for (const action of actions) {
        let cursor = 0;
        if (!isWord(action[cursor++], 'add')) continue;
        if (isWord(action[cursor], 'column')) cursor++;
        if (
          isWord(action[cursor], 'if') &&
          isWord(action[cursor + 1], 'not') &&
          isWord(action[cursor + 2], 'exists')
        )
          cursor += 3;
        if (
          isIdentifier(action[cursor]) &&
          !['constraint', 'primary', 'unique', 'check', 'foreign', 'exclude'].some((word) =>
            isWord(action[cursor], word),
          )
        ) {
          tables.get(name)?.add(action[cursor].value);
        }
      }
    }
  }
  return tables;
}
