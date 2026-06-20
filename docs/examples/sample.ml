(* sample.ml — OCaml module example *)

open List
open Printf

type 'a tree =
  | Leaf
  | Node of 'a * 'a tree * 'a tree

exception Empty_tree of string

let rec insert x = function
  | Leaf -> Node (x, Leaf, Leaf)
  | Node (y, left, right) ->
    if x < y then Node (y, insert x left, right)
    else if x > y then Node (y, left, insert x right)
    else Node (y, left, right)

let rec depth = function
  | Leaf -> 0
  | Node (_, l, r) -> 1 + max (depth l) (depth r)

let rec factorial n =
  if n <= 1 then 1 else n * factorial (n - 1)

external c_strlen : string -> int = "caml_string_length"

let () =
  let t = insert 5 (insert 3 (insert 7 Leaf)) in
  printf "Tree depth: %d\n" (depth t);
  printf "5! = %d\n" (factorial 5)
