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

var PI = Math.pi
var greeting = "Hello, Wren!"

var dog = Dog.new("Rex")
dog.learnTrick("sit")
dog.learnTrick("shake")
dog.speak()
System.print(dog.tricks)
System.print(Dog.breed)
