# LiveScript sample — classes, functions, fat arrows, backCalls

require! {
  'prelude-ls': { map, filter, fold }
  'fs': fs
}

# Class definition
class Animal
  (@name, @sound) ->
    @alive = true

  speak: ->
    "#{@name} says #{@sound}"

class Dog extends Animal
  (@name) ->
    super @name, 'Woof'
    @tricks = []

  learn: (trick) ->
    @tricks.push trick

  perform: ~>
    @tricks |> map (trick) -> "#{@name}: #{trick}"

# Named function
greet = (name) ->
  "Hello, #{name}!"

# Fat arrow (binds this)
addLogger = (prefix) ~>
  (msg) ~> console.log "#{prefix}: #{msg}"

# Async callback style with backCall
readFileAsync = (path, cb) ->
  err, data <- fs.readFile path, 'utf8'
  if err => cb err
  else cb null, data.trim!

# Simple value transforms using prelude.ls
doubled = map (* 2)
evens = filter (% 2 is 0)

module.exports = { Animal, Dog, greet, addLogger, readFileAsync, doubled, evens }
