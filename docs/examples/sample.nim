import strutils, sequtils, math

type
  Color = enum
    red, green, blue

  Point = object
    x, y: float

proc distance(a, b: Point): float =
  sqrt((b.x - a.x)^2 + (b.y - a.y)^2)

func greet(name: string): string =
  "Hello, " & name & "!"

iterator countUp(n: int): int =
  var i = 0
  while i < n:
    yield i
    inc i

const PI_APPROX = 3.14159

proc main() =
  let p1 = Point(x: 0.0, y: 0.0)
  let p2 = Point(x: 3.0, y: 4.0)
  echo "Distance: ", distance(p1, p2)
  echo greet("World")
  for i in countUp(5):
    echo i

main()
