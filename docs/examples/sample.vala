using GLib;
using Gtk;

public class Hello : Object {
    public string name { get; set; }

    public Hello(string name) {
        this.name = name;
    }

    public void greet() {
        print("Hello, %s!\n", this.name);
    }

    public static int main(string[] args) {
        var app = new Hello("World");
        app.greet();
        return 0;
    }
}

public interface Greeter {
    public abstract void greet();
}

public enum Color {
    RED,
    GREEN,
    BLUE
}
