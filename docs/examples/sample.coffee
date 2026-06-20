# CoffeeScript sample — class definitions, functions, requires

EventEmitter = require 'events'
_ = require 'underscore'
http = require 'http'

# Base animal class
class Animal
  constructor: (@name, @sound) ->
    @alive = true

  speak: ->
    "#{@name} says #{@sound}"

  toString: ->
    "[Animal: #{@name}]"

class Dog extends Animal
  constructor: (name) ->
    super name, 'Woof'
    @tricks = []

  learn: (trick) ->
    @tricks.push trick

  perform: =>
    for trick in @tricks
      console.log "#{@name} performs: #{trick}"

# Standalone utility functions
greet = (name) ->
  "Hello, #{name}!"

add = (a, b) -> a + b

multiply = (a, b) =>
  a * b

# Module exports
module.exports = { Animal, Dog, greet, add, multiply }
