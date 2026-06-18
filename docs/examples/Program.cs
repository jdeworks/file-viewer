using System;
using System.Collections.Generic;
using System.Linq;

record Build(string Name, int Warnings);

class Program {
  static void Main() {
    var builds = new List<Build> {
      new("main", 0),
      new("release", 2)
    };
    Console.WriteLine(builds.Sum(build => build.Warnings));
  }
}
