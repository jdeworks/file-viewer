require "json"
require "http/client"
require "log"

@[Link("z")]
lib LibZ
  fun compress(src : UInt8*, src_len : LibC::ULong, dest : UInt8*, dest_len : LibC::ULong*) : Int32
end

alias JsonHash = Hash(String, JSON::Any)

module Geometry
  PI = 3.14159265358979

  abstract class Shape
    abstract def area : Float64
    abstract def perimeter : Float64

    def describe : String
      "#{self.class.name}: area=#{area.round(2)}, perimeter=#{perimeter.round(2)}"
    end
  end

  class Circle < Shape
    getter radius : Float64

    def initialize(@radius : Float64)
    end

    def area : Float64
      PI * @radius ** 2
    end

    def perimeter : Float64
      2 * PI * @radius
    end
  end

  struct Point
    getter x : Float64
    getter y : Float64

    def initialize(@x : Float64, @y : Float64)
    end

    def distance_to(other : Point) : Float64
      Math.sqrt((@x - other.x) ** 2 + (@y - other.y) ** 2)
    end
  end

  enum Color
    Red
    Green
    Blue
  end
end

module Utils
  def self.clamp(value : Float64, min : Float64, max : Float64) : Float64
    value < min ? min : value > max ? max : value
  end

  macro debug_print(expr)
    puts "#{{{expr.stringify}}} = #{{{expr}}}"
  end
end

c = Geometry::Circle.new(5.0)
p1 = Geometry::Point.new(0.0, 0.0)
p2 = Geometry::Point.new(3.0, 4.0)

puts c.describe
puts "Distance: #{p1.distance_to(p2)}"
Utils.debug_print(c.area)
