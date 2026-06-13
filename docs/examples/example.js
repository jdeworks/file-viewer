// A code sample — opens in Monaco with JavaScript syntax highlighting.
export function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

const squares = [1, 2, 3, 4].map((x) => x * x);
console.log('fib(10) =', fib(10), 'squares =', squares);
