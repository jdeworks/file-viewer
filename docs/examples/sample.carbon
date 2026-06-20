// Carbon language sample — Google's C++ successor
package Demo api;

// A simple interface
interface Printable {
  fn Print[self: Self]() -> ();
}

// A class implementing Printable
class Shape {
  var name: String;
  var sides: i32;

  fn Create(name: String, sides: i32) -> Shape {
    return {.name = name, .sides = sides};
  }
}

impl Shape as Printable {
  fn Print[self: Self]() -> () {
    Print(self.name);
  }
}

class Circle {
  var radius: f64;

  fn Area[self: Self]() -> f64 {
    return 3.14159 * self.radius * self.radius;
  }
}

// Main function
fn Main() -> i32 {
  let shape: Shape = Shape.Create("Triangle", 3);
  shape.Print();
  return 0;
}
