extends CharacterBody2D

const step = 64

@onready var fog_tilemap: TileMapLayer = _find_fog_tilemap()
@onready var map: TileMapLayer = _find_map()
var last_direction: Vector2i = Vector2i(Vector2.ZERO)

func _find_fog_tilemap():
	var tilemaps = get_tree().get_nodes_in_group("fog_tilemap")
	if tilemaps.size() > 0:
		return tilemaps[0]
	else:
		push_error("Fog tilemap not found")
		return null

func _find_map():
	var tilemaps = get_tree().get_nodes_in_group("map")
	if tilemaps.size() > 0:
		return tilemaps[0]
	else:
		push_error("Fog tilemap not found")
		return null

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_UP:
			move(Vector2.UP)
		elif event.keycode == KEY_DOWN:
			move(Vector2.DOWN)
		elif event.keycode == KEY_LEFT:
			move(Vector2.LEFT)
		elif event.keycode == KEY_RIGHT:
			move(Vector2.RIGHT)
		elif event.keycode == KEY_SPACE:
			_throw_bomb()

func move(vector: Vector2):
	last_direction = vector
	var position_before = position
	var collision = move_and_collide(vector * step)
	position = snap_to_grid(position)
	_check_fog(position)
	if position != position_before:
		Globals.changeSteps(Globals.STEPS + 1)

func snap_to_grid(position: Vector2) -> Vector2:
	return (position / step).floor() * step + Vector2(step/2, step/2)
	
func _check_fog(player_position: Vector2):
	var cell_coordinate = fog_tilemap.local_to_map(fog_tilemap.to_local(player_position))
	if fog_tilemap.get_cell_tile_data(cell_coordinate):
		fog_tilemap.set_cell(cell_coordinate)
		
func _throw_bomb():
	if Globals.BOMBS > 0:
		var isExploded = map.destroy_wall(position, last_direction)
		if isExploded:
			Globals.updateBombs(Globals.BOMBS - 1)
