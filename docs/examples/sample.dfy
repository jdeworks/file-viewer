module Arithmetic {
  method Add(a: int, b: int) returns (result: int)
    requires a >= 0 && b >= 0
    ensures result == a + b
    ensures result >= 0
  {
    result := a + b;
  }

  function Factorial(n: nat): nat {
    if n == 0 then 1 else n * Factorial(n - 1)
  }

  predicate IsPositive(x: int) {
    x > 0
  }

  class Stack<T> {
    var items: seq<T>
    invariant |items| >= 0

    method Push(item: T)
      modifies this
      ensures |items| == old(|items|) + 1
    {
      items := items + [item];
    }
  }
}
