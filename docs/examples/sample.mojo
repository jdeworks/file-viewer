from python import Python
from math import sqrt, floor
import sys

alias MaxSize = 1024
alias ElementType = Float32

@value
struct Point:
    var x: Float64
    var y: Float64

    fn distance(self, other: Point) -> Float64:
        let dx = self.x - other.x
        let dy = self.y - other.dy
        return sqrt(dx * dx + dy * dy)

struct Matrix:
    var rows: Int
    var cols: Int
    var data: DynamicVector[Float32]

    fn __init__(inout self, rows: Int, cols: Int):
        self.rows = rows
        self.cols = cols
        self.data = DynamicVector[Float32]()

    fn get(self, row: Int, col: Int) -> Float32:
        return self.data[row * self.cols + col]

    fn set(inout self, row: Int, col: Int, val: Float32):
        self.data[row * self.cols + col] = val

fn add(a: Int, b: Int) -> Int:
    return a + b

async fn fetch_data(url: String) -> String:
    let np = Python.import_module("numpy")
    return url

fn relu(x: Float32) -> Float32:
    if x > 0:
        return x
    return 0.0

var global_count: Int = 0
let MAX_ITER: Int = 100

fn main():
    let p1 = Point(0.0, 0.0)
    let p2 = Point(3.0, 4.0)
    let m = Matrix(4, 4)
    global_count += 1
    print(add(global_count, MAX_ITER))
