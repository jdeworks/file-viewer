package main

import "core:fmt"
import "core:math"
import "core:os"
import "core:strings"

MAX_ENTITIES :: 1024
VERSION :: "1.0.0"

Vector2 :: struct {
  x: f32,
  y: f32,
}

Vector3 :: struct {
  x: f32,
  y: f32,
  z: f32,
}

Entity :: struct {
  id:       int,
  name:     string,
  position: Vector2,
  active:   bool,
}

Color :: enum {
  Red,
  Green,
  Blue,
  Alpha,
}

Shape :: union {
  Vector2,
  Vector3,
}

World :: struct {
  entities: [MAX_ENTITIES]Entity,
  count:    int,
}

vec2_add :: proc(a, b: Vector2) -> Vector2 {
  return Vector2{a.x + b.x, a.y + b.y}
}

vec2_length :: proc(v: Vector2) -> f32 {
  return math.sqrt(v.x * v.x + v.y * v.y)
}

entity_create :: proc(world: ^World, name: string, pos: Vector2) -> ^Entity {
  if world.count >= MAX_ENTITIES {
    return nil
  }
  e := &world.entities[world.count]
  e.id = world.count
  e.name = name
  e.position = pos
  e.active = true
  world.count += 1
  return e
}

entity_destroy :: proc(entity: ^Entity) {
  entity.active = false
}

world_update :: proc(world: ^World) {
  for i in 0 ..< world.count {
    e := &world.entities[i]
    if e.active {
      // update logic here
    }
  }
}

foreign_proc_example :: proc "c" (ctx: rawptr, value: i32) -> i32 {
  return value * 2
}

when ODIN_OS == .Windows {
  platform_init :: proc() { fmt.println("Windows init") }
} else {
  platform_init :: proc() { fmt.println("Unix init") }
}

main :: proc() {
  world: World
  pos := Vector2{1.0, 2.0}
  e := entity_create(&world, "player", pos)
  if e != nil {
    fmt.printf("Created entity: %s at (%.1f, %.1f)\n", e.name, e.position.x, e.position.y)
  }
  world_update(&world)
  fmt.println("Done. Version:", VERSION)
}
