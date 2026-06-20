// Chapel sample file

module Demo {

  config const n = 100;
  config const numTasks = 4;
  config var verbose = false;

  // A simple greeting procedure
  proc greet(name: string) {
    writeln("Hello, ", name, "!");
  }

  // Compute sum in parallel using forall
  proc parallelSum(arr: [] int): int {
    var total = 0;
    forall i in arr.domain with (+ reduce total) {
      total += arr[i];
    }
    return total;
  }

  // Launch multiple tasks with coforall
  proc runTasks() {
    coforall tid in 0..#numTasks {
      if verbose then
        writeln("Task ", tid, " running on locale ", here.id);
    }
  }

  // An iterator
  iter range2D(rows: int, cols: int) {
    for i in 0..#rows do
      for j in 0..#cols do
        yield (i, j);
  }

  // Entry point
  proc main() {
    greet("Chapel");
    var A: [1..n] int = 1..n;
    writeln("Sum 1..", n, " = ", parallelSum(A));
    runTasks();
  }
}
