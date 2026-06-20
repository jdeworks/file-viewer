/**
 * sample.d - D programming language example
 * Demonstrates modules, imports, classes, functions, templates, and unittests.
 */
module samples.animals;

import std.stdio;
import std.string;
import std.algorithm;
import std.range;
import std.conv;
import animals.base;
import animals.store;

/// Represents an animal with a name and species
class Animal {
    string name;
    string species;
    private int _age;

    this(string name, string species, int age = 0) {
        this.name = name;
        this.species = species;
        this._age = age;
    }

    @property int age() const @safe nothrow {
        return _age;
    }

    @property void age(int value) @safe {
        if (value < 0) throw new Exception("Age cannot be negative");
        _age = value;
    }

    override string toString() const @safe {
        return name ~ " (" ~ species ~ ")";
    }

    bool isAdult() const @safe @nogc nothrow {
        return _age >= 2;
    }
}

/// Abstract base for animal behaviours
interface Behaviour {
    string describe() const @safe;
    bool canFly() const @safe @nogc nothrow;
}

/// Concrete flying animal
class Bird : Animal, Behaviour {
    bool flightless;

    this(string name, string species, bool flightless = false) {
        super(name, species);
        this.flightless = flightless;
    }

    string describe() const @safe {
        return flightless ? name ~ " cannot fly" : name ~ " can fly";
    }

    bool canFly() const @safe @nogc nothrow {
        return !flightless;
    }
}

/// Generic container
struct AnimalStore(T : Animal) {
    private T[] _items;

    void add(T item) @safe {
        _items ~= item;
    }

    T[] findBySpecies(string species) @safe {
        return _items.filter!(a => a.species == species).array;
    }

    @property size_t length() const @safe @nogc nothrow {
        return _items.length;
    }
}

/// Statistics enum
enum AgeGroup {
    Juvenile,
    Adult,
    Senior
}

/// Template function: find maximum by field
template maxBy(alias field) {
    auto maxBy(R)(R range) {
        return range.maxElement!(a => mixin("a." ~ field));
    }
}

/// Format an animal description
@safe string formatAnimal(const Animal a) {
    return format!"[%s] %s, age %d"(a.species, a.name, a.age);
}

/// Classify animal by age
@safe @nogc nothrow AgeGroup classify(const Animal a) {
    if (a.age < 1) return AgeGroup.Juvenile;
    if (a.age < 10) return AgeGroup.Adult;
    return AgeGroup.Senior;
}

/// App entry point
void main() {
    auto eagle = new Bird("Eagle", "Haliaeetus leucocephalus");
    eagle.age = 5;

    auto penguin = new Bird("Penguin", "Aptenodytes forsteri", true);
    penguin.age = 3;

    auto store = AnimalStore!Animal();
    store.add(eagle);
    store.add(penguin);

    writeln("Animals: ", store.length);

    version (Posix) {
        writeln("Running on POSIX");
    }
    version (Windows) {
        writeln("Running on Windows");
    }
}

// Built-in unit tests
unittest {
    auto a = new Animal("Dog", "Canis lupus", 4);
    assert(a.isAdult);
    assert(a.toString() == "Dog (Canis lupus)");
}

unittest {
    auto b = new Bird("Ostrich", "Struthio camelus", true);
    assert(!b.canFly());
    assert(b.describe() == "Ostrich cannot fly");
}

unittest {
    auto store = AnimalStore!Animal();
    store.add(new Animal("Cat", "Felis catus", 2));
    store.add(new Animal("Lion", "Panthera leo", 6));
    assert(store.length == 2);
    assert(store.findBySpecies("Felis catus").length == 1);
}
