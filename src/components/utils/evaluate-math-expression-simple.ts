/**
 * Safely evaluates a mathematical expression string using a custom parser (no eval/Function)
 * Supports: +, -, *, /, % (percentage), parentheses, and decimal numbers
 * @param expr - The mathematical expression to evaluate (e.g., "2 + 2", "10 * (5 + 3)", "50%")
 * @returns The calculated result as a number, or undefined if invalid
 * @example
 * evaluateMathExpressionSimple("10%")       // 0.1
 * evaluateMathExpressionSimple("100 * 50%") // 50
 */
export function evaluateMathExpressionSimple(expr: string): number | undefined {
  expr = expr.trim();

  // Check length (prevent abuse)
  if (expr.length > 200 || !expr) {
    return undefined;
  }

  // Security: only digits, decimal points, spaces, and basic operators
  if (!/^[\d.\s+\-*/%()]+$/.test(expr)) {
    return undefined;
  }

  try {
    const result = parseExpression(expr);
    return Number.isFinite(result) ? result : undefined;
  } catch {
    return undefined;
  }
}

// Tokenizer
type Token = { type: "number"; value: number } | { type: "op"; value: string } | { type: "paren"; value: "(" | ")" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i]!;

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(char)) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i]!)) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    // Operators
    if (/[+\-*/%]/.test(char)) {
      tokens.push({ type: "op", value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i++;
      continue;
    }

    // Invalid character
    throw new Error("Invalid character");
  }

  return tokens;
}

// Recursive descent parser
function parseExpression(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++]!;
  }

  // Parse addition and subtraction (lowest precedence)
  function parseAddSub(): number {
    let left = parseMulDiv();

    while (peek()?.type === "op" && (peek()!.value === "+" || peek()!.value === "-")) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }

    return left;
  }

  // Parse multiplication and division (higher precedence)
  function parseMulDiv(): number {
    let left = parsePercentage();

    while (peek()?.type === "op" && (peek()!.value === "*" || peek()!.value === "/")) {
      const op = consume().value;
      const right = parsePercentage();
      if (op === "*") left = left * right;
      else left = left / right;
    }

    return left;
  }

  // Parse percentage (postfix operator)
  function parsePercentage(): number {
    let left = parseUnary();

    // Check for % after the value
    if (peek()?.type === "op" && peek()!.value === "%") {
      consume(); // consume '%'
      left = left / 100;
    }

    return left;
  }

  // Parse unary operators (-, +)
  function parseUnary(): number {
    if (peek()?.type === "op" && (peek()!.value === "-" || peek()!.value === "+")) {
      const op = consume().value;
      const value = parseUnary();
      return op === "-" ? -value : value;
    }
    return parsePrimary();
  }

  // Parse primary expressions (numbers and parentheses)
  function parsePrimary(): number {
    const token = peek();

    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    // Number
    if (token.type === "number") {
      return consume().value as number;
    }

    // Parentheses
    if (token.type === "paren" && token.value === "(") {
      consume(); // consume '('
      const result = parseAddSub();
      if (peek()?.type !== "paren" || peek()!.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      consume(); // consume ')'
      return result;
    }

    throw new Error("Unexpected token");
  }

  const result = parseAddSub();

  // Ensure all tokens were consumed
  if (pos < tokens.length) {
    throw new Error("Unexpected token after expression");
  }

  return result;
}
