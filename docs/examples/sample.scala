package com.example.demo

import scala.collection.mutable.ListBuffer
import scala.math.sqrt

case class Point(x: Double, y: Double)

case class Circle(center: Point, radius: Double)

object MathUtils {
  def distanceBetween(a: Point, b: Point): Double = {
    val dx = a.x - b.x
    val dy = a.y - b.y
    sqrt(dx * dx + dy * dy)
  }

  def circleArea(c: Circle): Double = Math.PI * c.radius * c.radius
}

trait Shape {
  def area: Double
  def perimeter: Double
}

object Main extends App {
  val p1 = Point(0.0, 0.0)
  val p2 = Point(3.0, 4.0)
  println(s"Distance: ${MathUtils.distanceBetween(p1, p2)}")
}
