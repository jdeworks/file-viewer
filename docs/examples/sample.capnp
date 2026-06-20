@0x8e7d3a8b1bc0d9bf;

using Cxx = import "/capnp/c++.capnp";
$Cxx.namespace("myapp");

struct Person {
  name @0 :Text;
  age @1 :UInt32;
  email @2 :Text;
  role @3 :Role;
}

enum Role {
  unknown @0;
  admin @1;
  user @2;
  guest @3;
}

interface UserService {
  getUser @0 (id :UInt64) -> (person :Person);
  listUsers @1 () -> (persons :List(Person));
}

const defaultAge :UInt32 = 18;
