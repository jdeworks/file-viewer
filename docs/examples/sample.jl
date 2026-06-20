module NumericalUtils

using LinearAlgebra
using Statistics
using Printf

import Base: show, length

# Type aliases
const Vector2D = Vector{Float64}
const Matrix2D = Matrix{Float64}

# Structs
struct Point
    x::Float64
    y::Float64
end

mutable struct BoundingBox
    min_x::Float64
    min_y::Float64
    max_x::Float64
    max_y::Float64
end

abstract type AbstractShape end

# Constants
const PI_APPROX = 3.14159265358979
const MAX_ITERATIONS = 1000

# Functions
function distance(p1::Point, p2::Point)::Float64
    sqrt((p1.x - p2.x)^2 + (p1.y - p2.y)^2)
end

function centroid(points::Vector{Point})::Point
    n = length(points)
    n == 0 && error("Empty point list")
    Point(mean(p.x for p in points), mean(p.y for p in points))
end

function normalize(v::Vector2D)::Vector2D
    n = norm(v)
    n == 0 ? v : v / n
end

function newton_sqrt(x::Float64; tol=1e-10, max_iter=MAX_ITERATIONS)::Float64
    x < 0 && throw(DomainError(x, "Cannot take sqrt of negative number"))
    guess = x / 2.0
    for _ in 1:max_iter
        new_guess = (guess + x / guess) / 2.0
        abs(new_guess - guess) < tol && return new_guess
        guess = new_guess
    end
    guess
end

show(io::IO, p::Point) = @printf(io, "Point(%.2f, %.2f)", p.x, p.y)

# Macros
macro timed_call(expr)
    quote
        t = @elapsed $(esc(expr))
        @printf("Elapsed: %.4f s\n", t)
    end
end

# Main logic
p1 = Point(0.0, 0.0)
p2 = Point(3.0, 4.0)

@printf("Distance: %.4f\n", distance(p1, p2))
@printf("Newton sqrt(2): %.10f\n", newton_sqrt(2.0))

end # module NumericalUtils
