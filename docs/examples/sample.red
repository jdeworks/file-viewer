Red [
    Title:   "Demo"
    Author:  "User"
    Version: 1.0.0
    Purpose: "Demonstrate Red language features"
]

; A simple greeting function
greet: func [name [string!]] [
    print join "Hello " name
]

; Calculate factorial
factorial: func [n [integer!]] [
    either n <= 1 [1] [n * factorial n - 1]
]

; A context (object) representing a person
person: context [
    name: "Alice"
    age: 30

    greet: func [] [
        print rejoin ["I am " name ", age " age]
    ]
]

; Another context for math utilities
math-utils: object [
    pi: 3.14159265

    area: func [radius [number!]] [
        pi * radius * radius
    ]

    circumference: func [radius [number!]] [
        2 * pi * radius
    ]
]

; Use the definitions
greet "World"
print factorial 5
person/greet
print math-utils/area 5.0
