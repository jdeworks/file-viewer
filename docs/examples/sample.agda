module Demo where

import Data.Nat
import Data.Bool
import Data.List

-- A simple data type
data Shape : Set where
  Circle    : Shape
  Rectangle : Shape
  Triangle  : Shape

-- A record type for points
record Point : Set where
  field
    x : Data.Nat.ℕ
    y : Data.Nat.ℕ

-- A simple function
area : Shape → Data.Nat.ℕ
area Circle    = 314
area Rectangle = 0
area Triangle  = 0

-- A postulate (axiom)
postulate
  funext : {A B : Set} {f g : A → B} → (∀ x → f x ≡ g x) → f ≡ g

-- An inductive type for natural numbers
data Nat : Set where
  zero : Nat
  suc  : Nat → Nat

-- Addition on our Nat type
add : Nat → Nat → Nat
add zero    m = m
add (suc n) m = suc (add n m)
