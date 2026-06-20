(* Wolfram Language sample *)

greet[name_] := Module[{msg},
  msg = StringJoin["Hello, ", name];
  Print[msg]
]

data = Table[{x, x^2}, {x, 1, 10}]

plot = Plot[Sin[x], {x, 0, 2*Pi}]

result = Map[greet, {"Alice", "Bob"}]
