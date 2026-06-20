const std = @import("std");
const math = @import("std").math;

/// A simple 2D point struct
const Point = struct {
    x: f64,
    y: f64,

    pub fn distance(self: Point, other: Point) f64 {
        const dx = self.x - other.x;
        const dy = self.y - other.y;
        return math.sqrt(dx * dx + dy * dy);
    }
};

const MathError = error{
    DivisionByZero,
    Overflow,
};

pub fn add(a: i32, b: i32) i32 {
    return a + b;
}

pub fn divide(a: f64, b: f64) !f64 {
    if (b == 0.0) return MathError.DivisionByZero;
    return a / b;
}

pub fn fibonacci(n: u32) u64 {
    if (n <= 1) return n;
    var a: u64 = 0;
    var b: u64 = 1;
    var i: u32 = 2;
    while (i <= n) : (i += 1) {
        const tmp = a + b;
        a = b;
        b = tmp;
    }
    return b;
}

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    defer stdout.context.close();

    const p1 = Point{ .x = 0.0, .y = 0.0 };
    const p2 = Point{ .x = 3.0, .y = 4.0 };

    const dist = p1.distance(p2);
    try stdout.print("Distance: {d}\n", .{dist});

    const sum = add(10, 32);
    try stdout.print("Sum: {d}\n", .{sum});

    const result = try divide(10.0, 2.0);
    try stdout.print("Result: {d}\n", .{result});

    comptime {
        const x: i32 = 42;
        _ = @TypeOf(x);
    }

    var i: u32 = 0;
    while (i < 10) : (i += 1) {
        const fib = fibonacci(i);
        try stdout.print("fib({d}) = {d}\n", .{ i, fib });
    }
}

test "add works correctly" {
    const result = add(2, 3);
    try std.testing.expectEqual(@as(i32, 5), result);
}

test "divide by zero returns error" {
    const result = divide(1.0, 0.0);
    try std.testing.expectError(MathError.DivisionByZero, result);
}
