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

-- An inductive type with constructors
inductive Color where
  | red
  | green
  | blue

-- A structure with typed fields
structure Point where
  x : Float
  y : Float

-- A type class capturing one operation
class Describable (α : Type) where
  describe : α → String

-- An instance of the class for Color
instance : Describable Color where
  describe c := "a color"

-- An incomplete proof, left as a placeholder
theorem hard_theorem (n : Nat) : n + 0 = n := by sorry

-- Using #check to inspect types
#check Nat.add_comm
#check List.length_append

end Demo
