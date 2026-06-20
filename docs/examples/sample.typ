#import "@preview/cetz:0.2.2": canvas, draw
#import "template.typ": *

#set document(title: "My Research Paper", author: "Alice Smith")
#set page(paper: "a4", margin: (x: 2.5cm, y: 3cm))
#set text(font: "Linux Libertine", size: 11pt)
#set heading(numbering: "1.")

#show heading: it => {
  set text(fill: rgb("#1a1a8c"))
  it
}

#let theorem(body, name: none) = {
  block(fill: luma(230), inset: 8pt, radius: 4pt)[
    *Theorem* #if name != none [(#name)] *:* #body
  ]
}

#let proof(body) = {
  block[_Proof:_ #body #align(right)[$square$]]
}

= Introduction

This paper explores the relationship between typesetting and mathematics.
Typst provides a modern alternative to LaTeX for document creation.

= Mathematical Foundations

#theorem(name: "Pythagorean theorem")[
  For a right triangle with legs $a$ and $b$ and hypotenuse $c$:
  $ a^2 + b^2 = c^2 $
]

#proof[
  Consider the square with side $a + b$. #lorem(20)
]

== Definitions

#let define(term, body) = [*#term*: #body]

#define("Typst")[A modern typesetting system with a scripting language.]
#define("Markup")[Text with inline formatting instructions.]

= Figures and Data

#figure(
  canvas({
    draw.circle((0, 0), radius: 1)
  }),
  caption: [A simple circle drawn with CeTZ],
)

#figure(
  table(
    columns: 3,
    [*Feature*], [*LaTeX*], [*Typst*],
    [Compilation], [Multi-pass], [Single-pass],
    [Scripting],   [Macros],    [Built-in],
    [Learning],    [Steep],     [Gradual],
  ),
  caption: [Feature comparison table],
)

= Conclusion

Typst offers a compelling alternative for document preparation.

#bibliography("references.bib")
