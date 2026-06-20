package com.example.game;

import haxe.ds.Map;
import haxe.io.Bytes;
import openfl.display.Sprite;
import openfl.events.Event;
import openfl.events.MouseEvent;

typedef Point = {
  x: Float,
  y: Float,
}

typedef Config = {
  width: Int,
  height: Int,
  title: String,
}

enum Direction {
  Up;
  Down;
  Left;
  Right;
}

abstract Color(Int) from Int to Int {
  public static inline var RED:Color = 0xFF0000;
  public static inline var GREEN:Color = 0x00FF00;
  public static inline var BLUE:Color = 0x0000FF;

  public function toHexString():String {
    return StringTools.hex(this, 6);
  }
}

@:keep
@:expose("Game")
class Game extends Sprite {
  public static var instance:Game;

  private var entities:Map<Int, Entity>;
  private var config:Config;
  private var running:Bool;

  public function new(config:Config) {
    super();
    this.config = config;
    this.entities = new Map();
    this.running = false;
    instance = this;
  }

  public function start():Void {
    running = true;
    addEventListener(Event.ENTER_FRAME, onEnterFrame);
  }

  public function stop():Void {
    running = false;
    removeEventListener(Event.ENTER_FRAME, onEnterFrame);
  }

  public inline function addEntity(entity:Entity):Void {
    entities.set(entity.id, entity);
  }

  public function removeEntity(id:Int):Bool {
    return entities.remove(id);
  }

  private function onEnterFrame(e:Event):Void {
    if (!running) return;
    for (entity in entities) {
      entity.update();
    }
  }

  override function toString():String {
    return 'Game(${config.title}, entities=${Lambda.count(entities)})';
  }
}

interface Updatable {
  function update():Void;
}

class Entity implements Updatable {
  public var id:Int;
  public var name:String;
  public var position:Point;

  public function new(id:Int, name:String) {
    this.id = id;
    this.name = name;
    this.position = {x: 0.0, y: 0.0};
  }

  public function update():Void {
    // override in subclasses
  }

  public function moveTo(x:Float, y:Float):Void {
    position = {x: x, y: y};
  }
}
