// sample.nut — Squirrel language demo

class Vector {
    x = 0;
    y = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    function length() {
        return sqrt(this.x * this.x + this.y * this.y);
    }

    function toString() {
        return "Vector(" + this.x + ", " + this.y + ")";
    }
}

class Matrix extends Vector {
    z = 0;

    constructor(x, y, z) {
        base.constructor(x, y);
        this.z = z;
    }
}

function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

function greet(name) {
    return "Hello, " + name + "!";
}

// Global namespace declarations
::GameConfig <- {
    version = "1.0",
    maxPlayers = 4
};

::EventBus <- {};

// Local variables and foreach usage
local v = Vector(1, 2);
local m = Matrix(3, 4, 5);

local table = { a = 1, b = 2, c = 3 };
foreach (k, val in table) {
    print(k + " = " + val);
}

local items = [10, 20, 30, 40];
foreach (idx, item in items) {
    print(idx + ": " + item);
}

print(greet("World"));
print(v.toString());
