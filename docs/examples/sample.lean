import Mathlib.Data.List.Basic
import Mathlib.Data.Nat.Basic

namespace Demo

-- A simple greeting function
def greet (name : String) : String :=
  "Hello, " ++ name ++ "!"

-- A basic theorem about natural number addition
theorem add_comm (n m : Nat) : n + m = m + n := by
  omega

-- Commutativity of addition (alternative proof)
lemma add_comm' : ∀ n m : Nat, n + m = m + n := fun n m => Nat.add_comm n m

-- A definition using pattern matching
def fibonacci : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fibonacci n + fibonacci (n + 1)

-- A theorem about list length
theorem list_length_append (l1 l2 : List α) :
    (l1 ++ l2).length = l1.length + l2.length := by
  simp [List.length_append]

-- Using #check to inspect types
#check Nat.add_comm
#check List.length_append

end Demo
