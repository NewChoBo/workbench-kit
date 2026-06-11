export type WorkbenchContextKeyValue = boolean | number | string | null | undefined;
export type WorkbenchContextKeySnapshot = Readonly<Record<string, WorkbenchContextKeyValue>>;

export class WorkbenchWhenClauseSyntaxError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(`${message} at position ${position}.`);
    this.name = 'WorkbenchWhenClauseSyntaxError';
  }
}

export function evaluateWorkbenchWhenClause(
  whenClause: string | undefined,
  contextKeys: WorkbenchContextKeySnapshot,
): boolean {
  const normalizedWhenClause = whenClause?.trim();
  if (normalizedWhenClause === undefined || normalizedWhenClause.length === 0) {
    return true;
  }

  return new WhenClauseParser(normalizedWhenClause, contextKeys).parse();
}

type TokenKind =
  | 'boolean'
  | 'eof'
  | 'identifier'
  | 'lparen'
  | 'null'
  | 'number'
  | 'operator'
  | 'rparen'
  | 'string';

interface Token {
  readonly kind: TokenKind;
  readonly position: number;
  readonly value: string;
}

type ComparableValue = boolean | number | string | null;

class WhenClauseParser {
  private cursor = 0;
  private currentToken: Token;
  private previousOperator = '';

  constructor(
    private readonly source: string,
    private readonly contextKeys: WorkbenchContextKeySnapshot,
  ) {
    this.currentToken = this.readNextToken();
  }

  parse(): boolean {
    const result = this.parseOrExpression();
    this.expect('eof');
    return result;
  }

  private parseOrExpression(): boolean {
    let result = this.parseAndExpression();

    while (this.consumeOperator('||')) {
      const right = this.parseAndExpression();
      result ||= right;
    }

    return result;
  }

  private parseAndExpression(): boolean {
    let result = this.parseUnaryExpression();

    while (this.consumeOperator('&&')) {
      const right = this.parseUnaryExpression();
      result &&= right;
    }

    return result;
  }

  private parseUnaryExpression(): boolean {
    if (this.consumeOperator('!')) {
      return !this.parseUnaryExpression();
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): boolean {
    if (this.currentToken.kind === 'lparen') {
      this.advance();
      const result = this.parseOrExpression();
      this.expect('rparen');
      return result;
    }

    return this.parseContextKeyExpression();
  }

  private parseContextKeyExpression(): boolean {
    const contextKeyToken = this.expect('identifier');
    const contextValue = this.contextKeys[contextKeyToken.value];

    if (
      !this.consumeOperator('==') &&
      !this.consumeOperator('===') &&
      !this.consumeOperator('!=') &&
      !this.consumeOperator('!==')
    ) {
      return resolveContextKeyTruthiness(contextValue);
    }

    const operator = this.previousOperator;
    const expectedValue = this.parseComparableValue();
    const equal = compareContextKeyValue(contextValue, expectedValue);
    return operator === '==' || operator === '===' ? equal : !equal;
  }

  private consumeOperator(operator: string): boolean {
    if (this.currentToken.kind !== 'operator' || this.currentToken.value !== operator) {
      return false;
    }

    this.previousOperator = operator;
    this.advance();
    return true;
  }

  private parseComparableValue(): ComparableValue {
    const token = this.currentToken;
    switch (token.kind) {
      case 'boolean':
        this.advance();
        return token.value === 'true';
      case 'identifier':
      case 'string':
        this.advance();
        return token.value;
      case 'null':
        this.advance();
        return null;
      case 'number':
        this.advance();
        return Number(token.value);
      default:
        throw this.createSyntaxError('Expected a comparison value', token.position);
    }
  }

  private expect(kind: TokenKind): Token {
    const token = this.currentToken;
    if (token.kind !== kind) {
      throw this.createSyntaxError(`Expected ${kind}`, token.position);
    }

    this.advance();
    return token;
  }

  private advance(): void {
    this.currentToken = this.readNextToken();
  }

  private readNextToken(): Token {
    this.skipWhitespace();

    const position = this.cursor;
    if (this.cursor >= this.source.length) {
      return {
        kind: 'eof',
        position,
        value: '',
      };
    }

    const char = this.source[this.cursor];
    if (char === '(') {
      this.cursor += 1;
      return { kind: 'lparen', position, value: char };
    }
    if (char === ')') {
      this.cursor += 1;
      return { kind: 'rparen', position, value: char };
    }
    if (char === "'" || char === '"') {
      return this.readStringToken(char, position);
    }

    const operatorToken = this.readOperatorToken(position);
    if (operatorToken !== null) {
      return operatorToken;
    }

    return this.readWordToken(position);
  }

  private readStringToken(quote: string, position: number): Token {
    this.cursor += 1;
    let value = '';

    while (this.cursor < this.source.length) {
      const char = this.source[this.cursor];
      if (char === quote) {
        this.cursor += 1;
        return {
          kind: 'string',
          position,
          value,
        };
      }

      if (char === '\\') {
        const nextChar = this.source[this.cursor + 1];
        if (nextChar === undefined) {
          break;
        }

        value += nextChar;
        this.cursor += 2;
        continue;
      }

      value += char;
      this.cursor += 1;
    }

    throw this.createSyntaxError('Unterminated string literal', position);
  }

  private readOperatorToken(position: number): Token | null {
    for (const operator of ['===', '!==', '&&', '||', '==', '!=', '!']) {
      if (this.source.startsWith(operator, this.cursor)) {
        this.cursor += operator.length;
        return {
          kind: 'operator',
          position,
          value: operator,
        };
      }
    }

    return null;
  }

  private readWordToken(position: number): Token {
    let value = '';

    while (this.cursor < this.source.length) {
      const char = this.source[this.cursor];
      if (char === undefined || /\s/u.test(char) || /[()!&|=]/u.test(char)) {
        break;
      }

      value += char;
      this.cursor += 1;
    }

    if (value.length === 0) {
      throw this.createSyntaxError('Unexpected token', position);
    }

    if (value === 'true' || value === 'false') {
      return {
        kind: 'boolean',
        position,
        value,
      };
    }

    if (value === 'null') {
      return {
        kind: 'null',
        position,
        value,
      };
    }

    if (/^-?\d+(?:\.\d+)?$/u.test(value)) {
      return {
        kind: 'number',
        position,
        value,
      };
    }

    return {
      kind: 'identifier',
      position,
      value,
    };
  }

  private skipWhitespace(): void {
    while (this.cursor < this.source.length && /\s/u.test(this.source[this.cursor] ?? '')) {
      this.cursor += 1;
    }
  }

  private createSyntaxError(message: string, position: number): WorkbenchWhenClauseSyntaxError {
    return new WorkbenchWhenClauseSyntaxError(message, position);
  }
}

function resolveContextKeyTruthiness(value: WorkbenchContextKeyValue): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return value.length > 0;
}

function compareContextKeyValue(
  contextValue: WorkbenchContextKeyValue,
  expectedValue: ComparableValue,
): boolean {
  if (contextValue === undefined) {
    return false;
  }

  return contextValue === expectedValue;
}
