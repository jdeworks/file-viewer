// A code sample — opens in Monaco with JavaScript syntax highlighting.
// Each function shows a CodeLens above it: ƒ name · LOC · cyclomatic complexity.

export function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// Higher complexity: several decision points (if / && / ||).
function classify(x) {
  if (x < 0) return 'negative';
  if (x === 0) return 'zero';
  if (x < 10 && x % 2 === 0) return 'small-even';
  if (x > 100 || x === 42) return 'special';
  return 'other';
}

const squares = [1, 2, 3, 4].map((x) => x * x);
console.log('fib(10) =', fib(10), 'classify(42) =', classify(42), 'squares =', squares);
