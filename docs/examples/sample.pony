use "collections"
use "time"

interface Printable
  fun print_info(): String

trait Serializable
  fun serialize(): String
  fun deserialize(s: String): None

primitive Colors
  fun red(): String => "red"
  fun green(): String => "green"
  fun blue(): String => "blue"

type ColorSet is Set[String]

actor Counter
  var _count: U64 = 0

  be increment() =>
    _count = _count + 1

  be reset() =>
    _count = 0

  be get(cb: {(U64)} iso) =>
    cb(_count)

class Dog
  let name: String
  var age: U8

  new create(name': String, age': U8) =>
    name = name'
    age = age'

  fun greeting(): String =>
    "Woof! I am " + name

  fun info(): String =>
    name + " (age " + age.string() + ")"

actor Main
  new create(env: Env) =>
    let c = Counter
    c.increment()
    c.increment()
    let dog = Dog("Rex", 3)
    env.out.print(dog.greeting())
