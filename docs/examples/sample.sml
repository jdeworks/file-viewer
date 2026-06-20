structure Main = struct
  val x = 42
  val greeting = "Hello, World!"

  fun greet name =
    "Hello, " ^ name ^ "!"

  fun factorial 0 = 1
    | factorial n = n * factorial (n - 1)

  fun fibonacci 0 = 0
    | fibonacci 1 = 1
    | fibonacci n = fibonacci (n - 1) + fibonacci (n - 2)
end

signature MATH = sig
  val pi : real
  val square : real -> real
  val cube : real -> real
end

structure Math : MATH = struct
  val pi = 3.14159265358979
  fun square x = x * x
  fun cube x = x * x * x
end

functor MakeSet(type elem val eq : elem * elem -> bool) = struct
  type t = elem list
  val empty : t = []
  fun member x [] = false
    | member x (h :: t) = eq(x, h) orelse member x t
  fun insert x s = if member x s then s else x :: s
end
