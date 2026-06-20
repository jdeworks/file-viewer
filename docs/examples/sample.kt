package com.example.demo

import kotlin.collections.listOf
import kotlin.math.sqrt

data class Point(val x: Double, val y: Double)

data class Circle(val center: Point, val radius: Double)

object MathUtils {
    fun distanceBetween(a: Point, b: Point): Double {
        val dx = a.x - b.x
        val dy = a.y - b.y
        return sqrt(dx * dx + dy * dy)
    }
}

fun Circle.area(): Double = Math.PI * radius * radius

suspend fun fetchPoints(): List<Point> {
    return listOf(Point(0.0, 0.0), Point(3.0, 4.0))
}

fun main() {
    val p1 = Point(0.0, 0.0)
    val p2 = Point(3.0, 4.0)
    val c = Circle(p1, 5.0)
    println("Distance: ${MathUtils.distanceBetween(p1, p2)}")
    println("Area: ${c.area()}")
}
