theory ListSorting
  imports Main "HOL-Library.List_Lexorder"
begin

lemma length_sort: "length (sort xs) = length xs"
  by (simp add: sort_key_def)

theorem sorted_sort: "sorted (sort xs)"
  by (rule sorted_sort)

definition is_permutation :: "'a list ⇒ 'a list ⇒ bool" where
  "is_permutation xs ys ⟷ mset xs = mset ys"

lemma sort_permutation: "is_permutation xs (sort xs)"
  by (simp add: is_permutation_def)

end
