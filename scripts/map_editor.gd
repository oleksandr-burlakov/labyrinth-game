extends Node

@onready var map: TileMapLayer = $HSplitContainer/MapPanel/TileMapLayer
enum EditAction { WALLS, CLEAR }
var current_edit_action = EditAction.WALLS

func _ready() -> void:
	pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	if Input.is_action_pressed("click"):
		var map_coords = map.local_to_map(map.to_local(get_viewport().get_mouse_position()))
		if map_coords.x < 10 && map_coords.y < 10 && map_coords.x >= 0 && map_coords.y >= 0:
			var dir = Utils.vector_to_dir(_get_direction(map.to_local(get_viewport().get_mouse_position()), map_coords))
			var current_walls = Utils.get_wall_from_cords(map.get_cell_atlas_coords(map_coords))
			var image_coords = Utils.dir_to_coor(current_walls ^ dir)
			map.set_cell(map_coords, 3, image_coords)
	#elif event is InputEventMouseMotion:
	#	var map_coords = map.local_to_map(map.to_local(event.position))
	#	if map_coords.x < 10 && map_coords.y < 10 && map_coords.x >= 0 && map_coords.y >= 0:
	#		pass

func _cross2d(a: Vector2, b: Vector2):
	return a.x * b.y - a.y * b.x

func isInside(a: Vector2, b: Vector2, c: Vector2, point: Vector2):
	var an: Vector2 = a - point
	var bn: Vector2 = b - point
	var cn: Vector2 = c - point
	var orientation: bool = _cross2d(an, bn) > 0
	if ((_cross2d(bn,cn) > 0) != orientation):
		return false
	return (_cross2d(cn,an) > 0) == orientation

func _get_direction(position: Vector2, position_int: Vector2i) -> Vector2i:
	var center = Vector2(position_int.x * Globals.CELL_SIZE + Globals.CELL_SIZE / 2,
		position_int.y * Globals.CELL_SIZE + Globals.CELL_SIZE / 2)
	var bottom_left = Vector2(center.x - Globals.CELL_SIZE / 2, center.y - Globals.CELL_SIZE / 2)
	var bottom_right = Vector2(center.x - Globals.CELL_SIZE / 2, center.y + Globals.CELL_SIZE / 2)
	var top_left = Vector2(center.x + Globals.CELL_SIZE / 2, center.y - Globals.CELL_SIZE / 2)
	var top_right = Vector2(center.x + Globals.CELL_SIZE / 2, center.y + Globals.CELL_SIZE / 2)
	
	if isInside(center, bottom_left, top_left, position):
		return Vector2i.UP
	elif isInside(center, top_left, top_right, position):
		return Vector2i.RIGHT
	elif isInside(center, top_right, bottom_right, position):
		return Vector2i.DOWN
	else:
		return Vector2i.LEFT

func _on_generate_button_pressed() -> void:
	var map_array = Utils.map_to_coors(Utils.make_maze())
	map.clear()
	for x in len(map_array):
		for y in len(map_array[x]):
			map.set_cell(Vector2i(x,y), 3, map_array[x][y])


func _on_clear_button_pressed() -> void:
	current_edit_action = EditAction.CLEAR

func _on_h_split_container_gui_input(event: InputEvent) -> void:
	print('Mouse click')
