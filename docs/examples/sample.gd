@tool
@icon("res://assets/icons/enemy.svg")
class_name Enemy
extends CharacterBody2D

signal died(score: int)
signal health_changed(old_health: int, new_health: int)

@export var max_health: int = 100
@export var move_speed: float = 150.0
@export var attack_damage: int = 10
@export_group("AI")
@export var detection_range: float = 200.0

const MAX_JUMP_HEIGHT: float = 64.0
const GRAVITY: float = 980.0

enum State {
	IDLE,
	PATROL,
	CHASE,
	ATTACK,
	DEAD,
}

var health: int = max_health
var current_state: State = State.IDLE
var target: Node2D = null

class HitBox:
	var damage: int
	var knockback: Vector2
	func _init(d: int, k: Vector2) -> void:
		damage = d
		knockback = k

func _ready() -> void:
	health = max_health
	add_to_group("enemies")

func _physics_process(delta: float) -> void:
	match current_state:
		State.IDLE:
			_idle_behavior(delta)
		State.PATROL:
			_patrol_behavior(delta)
		State.CHASE:
			_chase_behavior(delta)
		State.ATTACK:
			_attack_behavior(delta)

func take_damage(amount: int, source: Node2D = null) -> void:
	var old_health = health
	health = clampi(health - amount, 0, max_health)
	health_changed.emit(old_health, health)
	if health <= 0:
		_die()

@rpc("any_peer", "reliable")
func sync_position(pos: Vector2) -> void:
	global_position = pos

static func create_from_scene(scene: PackedScene, pos: Vector2) -> Enemy:
	var enemy: Enemy = scene.instantiate()
	enemy.global_position = pos
	return enemy

func _idle_behavior(_delta: float) -> void:
	pass

func _patrol_behavior(_delta: float) -> void:
	pass

func _chase_behavior(_delta: float) -> void:
	if target:
		var direction = (target.global_position - global_position).normalized()
		velocity = direction * move_speed

func _attack_behavior(_delta: float) -> void:
	pass

func _die() -> void:
	current_state = State.DEAD
	died.emit(10)
	queue_free()
