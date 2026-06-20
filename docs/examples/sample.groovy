package com.example.demo

import groovy.transform.CompileStatic
import groovy.transform.ToString
import java.util.logging.Logger
import java.util.logging.Level

@CompileStatic
class MathUtils {
    private static final Logger log = Logger.getLogger(MathUtils.class.name)

    static int factorial(int n) {
        if (n <= 1) return 1
        return n * factorial(n - 1)
    }

    static double mean(List<Number> values) {
        if (!values) throw new IllegalArgumentException('Empty list')
        values.sum() / values.size()
    }
}

@ToString(includeFields = true)
class Point {
    double x
    double y

    Point(double x, double y) {
        this.x = x
        this.y = y
    }

    double distanceTo(Point other) {
        Math.sqrt((x - other.x) ** 2 + (y - other.y) ** 2)
    }
}

interface Shape {
    double area()
    double perimeter()
}

class Circle implements Shape {
    double radius

    Circle(double radius) {
        this.radius = radius
    }

    double area() { Math.PI * radius ** 2 }
    double perimeter() { 2 * Math.PI * radius }
}

def greet = { name -> "Hello, ${name}!" }
def square = { x -> x * x }

def numbers = [1, 2, 3, 4, 5]
def doubled = numbers.collect { it * 2 }
def evens = numbers.findAll { it % 2 == 0 }

println greet("Groovy")
println "Doubled: ${doubled}"
println "Evens: ${evens}"
println "Factorial(5): ${MathUtils.factorial(5)}"
println "Mean: ${MathUtils.mean(numbers)}"
