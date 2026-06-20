import gleam/io
import gleam/list
import gleam/string
import gleam/result as res

pub type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
  Triangle(base: Float, height: Float)
}

pub type Color =
  String

pub const pi = 3.14159

pub fn area(shape: Shape) -> Float {
  case shape {
    Circle(r) -> pi *. r *. r
    Rectangle(w, h) -> w *. h
    Triangle(b, h) -> b *. h /. 2.0
  }
}

pub fn perimeter(shape: Shape) -> Float {
  case shape {
    Circle(r) -> 2.0 *. pi *. r
    Rectangle(w, h) -> 2.0 *. { w +. h }
    Triangle(b, h) -> b +. h +. { b *. b +. h *. h }
  }
}

pub fn describe(shape: Shape) -> String {
  case shape {
    Circle(_) -> "circle"
    Rectangle(_, _) -> "rectangle"
    Triangle(_, _) -> "triangle"
  }
}

fn clamp(value: Float, min: Float, max: Float) -> Float {
  case value <. min {
    True -> min
    False ->
      case value >. max {
        True -> max
        False -> value
      }
  }
}

fn scale(shape: Shape, factor: Float) -> Shape {
  let f = clamp(factor, 0.1, 10.0)
  case shape {
    Circle(r) -> Circle(r *. f)
    Rectangle(w, h) -> Rectangle(w *. f, h *. f)
    Triangle(b, h) -> Triangle(b *. f, h *. f)
  }
}

pub fn main() {
  let shapes = [Circle(5.0), Rectangle(4.0, 6.0), Triangle(3.0, 4.0)]
  list.each(shapes, fn(s) {
    io.println(describe(s) <> " area: " <> string.inspect(area(s)))
  })
}
