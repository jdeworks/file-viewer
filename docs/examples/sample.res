// ReScript sample — lets, types, module opens, React component

open Belt
open React

// Type definitions
type animal = {
  name: string,
  sound: string,
  alive: bool,
}

type dogTrick =
  | Sit
  | Shake
  | Roll

// Module definition
module AnimalUtils = {
  let makeAnimal = (name, sound) => {
    name,
    sound,
    alive: true,
  }

  let speak = (animal) => {
    animal.name ++ " says " ++ animal.sound
  }
}

// Let bindings
let defaultDog = AnimalUtils.makeAnimal("Rex", "Woof")

let greet = (name) => "Hello, " ++ name ++ "!"

let add = (a, b) => a + b

// External JS binding
external alert: string => unit = "alert"
external setTimeout: (unit => unit, int) => int = "setTimeout"

// @decorator usage
@module("react") @val
external createElement: (string, 'props) => element = "createElement"

// JSX React component
@react.component
let make = (~name: string, ~sound: string) => {
  let animal = AnimalUtils.makeAnimal(name, sound)
  let message = AnimalUtils.speak(animal)
  <div className="animal-card">
    <h2> {React.string(animal.name)} </h2>
    <p> {React.string(message)} </p>
  </div>
}
