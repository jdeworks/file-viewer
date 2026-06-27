import "math" for Math
import "io" for File, Directory

class Animal {
  construct new(name, sound) {
    _name = name
    _sound = sound
  }

  name { _name }
  sound { _sound }

  speak() {
    System.print(_name + " says " + _sound)
  }

  toString { "Animal(" + _name + ")" }
}

class Dog is Animal {
  construct new(name) {
    super(name, "woof")
    _tricks = []
  }

  static breed { "Canis lupus familiaris" }

  foreign fetch(item)

  learnTrick(trick) {
    _tricks.add(trick)
  }

  tricks { _tricks }
}

class Vector is Sequence {
  construct new(x, y) {
    _x = x
    _y = y
  }

  x { _x }
  y { _y }
  x=(value) { _x = value }

  +(other) { Vector.new(_x + other.x, _y + other.y) }
  ==(other) { _x == other.x && _y == other.y }
  [index] { index == 0 ? _x : _y }

  static zero { Vector.new(0, 0) }

  toString { "(%(_x), %(_y))" }
}

var PI = Math.pi
var greeting = "Hello, Wren!"

var dog = Dog.new("Rex")
dog.learnTrick("sit")
dog.learnTrick("shake")
dog.speak()
System.print(dog.tricks)
System.print(Dog.breed)
