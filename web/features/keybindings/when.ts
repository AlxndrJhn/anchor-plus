/**
 * "When" clauses, as in VS Code: context keys joined with `&&`, `||` and `!`,
 * grouped with parentheses, and compared with `==` or `!=`:
 *
 *   noteOpen && !cardFocus
 *   view == 'notes' || view == archive
 */

export type ContextValue = string | number | boolean | null | undefined;
export type Context = (key: string) => ContextValue;
export type When = (context: Context) => boolean;

type Token =
  | { kind: "name"; text: string }
  | { kind: "string"; text: string }
  | { kind: "op"; text: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (["&&", "||", "==", "!="].includes(two)) {
      tokens.push({ kind: "op", text: two });
      i += 2;
      continue;
    }
    if ("!()".includes(c)) {
      tokens.push({ kind: "op", text: c });
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = source.indexOf(c, i + 1);
      if (end < 0) throw new Error("a quote isn't closed");
      tokens.push({ kind: "string", text: source.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const name = /^[\w.:-]+/.exec(source.slice(i));
    if (!name) throw new Error(`unexpected "${c}"`);
    tokens.push({ kind: "name", text: name[0] });
    i += name[0].length;
  }
  return tokens;
}

/** Reads a when clause; throws, saying where, on one it can't read. */
export function parseWhen(source: string | undefined): When {
  if (!source?.trim()) return () => true;
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at];
  const isOp = (text: string) => peek()?.kind === "op" && peek()?.text === text;
  const take = () => tokens[at++];

  const literal = (token: Token | undefined): ContextValue => {
    if (!token || token.kind === "op") throw new Error("expected a value");
    if (token.kind === "string") return token.text;
    if (token.text === "true") return true;
    if (token.text === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(token.text)) return Number(token.text);
    return token.text;
  };

  const primary = (): When => {
    if (isOp("!")) {
      take();
      const inner = primary();
      return (ctx) => !inner(ctx);
    }
    if (isOp("(")) {
      take();
      const inner = or();
      if (!isOp(")")) throw new Error("a parenthesis isn't closed");
      take();
      return inner;
    }
    const token = take();
    if (token?.kind !== "name")
      throw new Error(token ? `unexpected "${token.text}"` : "ends too soon");
    const key = token.text;
    if (key === "true") return () => true;
    if (key === "false") return () => false;
    if (isOp("==") || isOp("!=")) {
      const negate = take().text === "!=";
      const value = literal(take());
      // A number in the context matches its written digits too.
      return (ctx) => (String(ctx(key)) === String(value)) !== negate;
    }
    return (ctx) => !!ctx(key);
  };

  const and = (): When => {
    let left = primary();
    while (isOp("&&")) {
      take();
      const l = left;
      const r = primary();
      left = (ctx) => l(ctx) && r(ctx);
    }
    return left;
  };

  const or = (): When => {
    let left = and();
    while (isOp("||")) {
      take();
      const l = left;
      const r = and();
      left = (ctx) => l(ctx) || r(ctx);
    }
    return left;
  };

  const when = or();
  if (at < tokens.length) throw new Error(`unexpected "${peek().text}"`);
  return when;
}

/** The context keys a when clause reads, for showing which are unknown. */
export function whenKeys(source: string | undefined): string[] {
  if (!source) return [];
  const keys: string[] = [];
  const tokens = tokenize(source);
  tokens.forEach((token, i) => {
    const before = tokens[i - 1];
    if (
      token.kind === "name" &&
      !(
        before?.kind === "op" &&
        (before.text === "==" || before.text === "!=")
      ) &&
      token.text !== "true" &&
      token.text !== "false"
    )
      keys.push(token.text);
  });
  return keys;
}
