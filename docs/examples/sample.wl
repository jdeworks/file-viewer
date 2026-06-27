(* ::Package:: *)
(* VectorTools.wl — sample Wolfram Language package
   Demonstrates pattern-based definitions, usage messages,
   options, attributes, and (* nested *) comments. *)

BeginPackage["VectorTools`", {"GeneralUtilities`"}]

Needs["Developer`"]

dotProduct::usage = "dotProduct[a_List, b_List] returns the dot product of two vectors.";
scale::usage      = "scale[v_List, factor_:1] scales vector v by a factor (default 1).";
normalize::usage  = "normalize[v_List] returns the unit vector of v.";

Begin["`Private`"]

SetAttributes[dotProduct, {Listable, Protected}]

Options[normalize] = {Tolerance -> 10^-10, Method -> Automatic};

dotProduct[a_List, b_List] := Total[a*b]

scale[v_List, factor_:1] := factor * v

normalize[v_List, OptionsPattern[]] := Module[{mag, tol},
  tol = OptionValue[Tolerance];
  mag = Sqrt[dotProduct[v, v]];   (* guard against the (* zero *) vector *)
  If[mag < tol, v, v/mag]
]

clamp[x_?NumericQ, lo_:0, hi_:1] := Min[Max[x, lo], hi]

magnitude[v_List] = Sqrt[Total[v^2]]

End[]

EndPackage[]
