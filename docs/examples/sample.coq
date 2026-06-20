Require Import Coq.Arith.Arith.
Require Import Coq.Lists.List.

Module Sorting.

Inductive sorted : list nat -> Prop :=
  | sorted_nil : sorted []
  | sorted_single : forall n, sorted [n]
  | sorted_cons : forall n m l,
      n <= m -> sorted (m :: l) -> sorted (n :: m :: l).

Fixpoint insert (x : nat) (l : list nat) : list nat :=
  match l with
  | [] => [x]
  | h :: t => if x <=? h then x :: l else h :: insert x t
  end.

Theorem insert_sorted : forall x l,
  sorted l -> sorted (insert x l).
Proof.
  intros x l H.
  induction H; simpl; auto.
  - destruct (x <=? n); constructor; auto; lia.
  - destruct (x <=? n) eqn:E; auto.
    constructor; [lia | auto].
Qed.

Lemma sorted_nil_trivial : sorted [].
Proof. constructor. Qed.

End Sorting.
