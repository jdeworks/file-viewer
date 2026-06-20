# Sample Ruby file demonstrating module/class structure
require 'json'
require 'net/http'
require_relative 'utils/helpers'
require_relative 'models/base'

module Greeter
  VERSION = '1.0.0'.freeze

  module Formatter
    def format_name(name)
      name.strip.capitalize
    end
  end
end

class Animal
  include Greeter::Formatter
  extend Comparable

  attr_accessor :name, :age
  attr_reader :species
  attr_writer :habitat

  def initialize(name, species, age = 0)
    @name = name
    @species = species
    @age = age
    @habitat = 'unknown'
  end

  def speak
    "#{@name} says hello"
  end

  def to_s
    "#{@species}: #{@name} (age #{@age})"
  end

  def to_json(*args)
    { name: @name, species: @species, age: @age }.to_json
  end

  private

  def internal_id
    "#{@species}-#{@name.downcase}"
  end

  def log_action(action)
    puts "[#{Time.now}] #{action} for #{@name}"
  end

  protected

  def compare_age(other)
    @age <=> other.age
  end
end

class Dog < Animal
  include Greeter

  attr_accessor :breed

  def initialize(name, breed, age = 0)
    super(name, 'Canis lupus familiaris', age)
    @breed = breed
  end

  def speak
    "#{@name} barks: Woof!"
  end

  def fetch(item)
    "#{@name} fetches the #{item}!"
  end

  private

  def validate_breed
    raise ArgumentError, "Breed cannot be empty" if @breed.nil? || @breed.empty?
  end
end

module Serializable
  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods
    def from_json(json_str)
      data = JSON.parse(json_str)
      new(data['name'], data['species'], data['age'])
    end
  end

  def serialize
    to_json
  end
end
