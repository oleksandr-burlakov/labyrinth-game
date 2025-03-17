extends Node

@onready var map: TileMapLayer = $HSplitContainer/MapPanel/TileMapLayer
@onready var hover_map: TileMapLayer = $HSplitContainer/MapPanel/TileMapLayer/HoverMap
enum EditAction { WALLS, CLEAR }
var current_edit_action = EditAction.WALLS

func _ready() -> void:
	pass

func _process(delta: float) -> void:
	pass

var previous_mouse_direction: Vector2i
var previous_map_coords: Vector2i

func _input(event: InputEvent) -> void:
	if Input.is_action_pressed("click"):
		print(get_viewport().get_mouse_position())
		var map_coords = map.local_to_map(map.to_local(get_viewport().get_mouse_position()))
		if map_coords.x < 10 && map_coords.y < 10 && map_coords.x >= 0 && map_coords.y >= 0:
			print('Inside')
			var dir = Utils.vector_to_dir(_get_direction(map.to_local(get_viewport().get_mouse_position()), map_coords))
			var current_walls = Utils.get_wall_from_cords(map.get_cell_atlas_coords(map_coords))
			var image_coords = Utils.dir_to_coor(current_walls | dir)
			map.set_cell(map_coords, 3, image_coords)
	elif Input.is_action_pressed("right_click"):
		print(get_viewport().get_mouse_position())
		var map_coords = map.local_to_map(map.to_local(get_viewport().get_mouse_position()))
		if map_coords.x < 10 && map_coords.y < 10 && map_coords.x >= 0 && map_coords.y >= 0:
			print('Inside')
			var dir = Utils.vector_to_dir(_get_direction(map.to_local(get_viewport().get_mouse_position()), map_coords))
			var current_walls = Utils.get_wall_from_cords(map.get_cell_atlas_coords(map_coords))
			var image_coords = Utils.dir_to_coor(current_walls & ~dir)
			map.set_cell(map_coords, 3, image_coords) # TODO: remake it to do only with array
	if event is InputEventMouseMotion:
		var map_coords = hover_map.local_to_map(hover_map.to_local(get_viewport().get_mouse_position()))
		if map_coords.x < 10 && map_coords.y < 10 && map_coords.x >= 0 && map_coords.y >= 0:
			var vector_direction = _get_direction(hover_map.to_local(get_viewport().get_mouse_position()), map_coords)
			previous_mouse_direction = vector_direction
			var dir = Utils.vector_to_dir(vector_direction)
			previous_map_coords = map_coords
			var image_coords = Utils.dir_to_coor(dir)
			hover_map.clear()
			hover_map.set_cell(map_coords, 0, image_coords)

func _sign(p1: Vector2, p2: Vector2, p3: Vector2) -> float :
	return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)

func _pointInTriangle(v1: Vector2, v2: Vector2, v3:Vector2, pt: Vector2) -> bool:
	var d1 = _sign(pt, v1, v2)
	var d2 = _sign(pt, v2, v3)
	var d3 = _sign(pt, v3, v1)
	var has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0)
	var has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0)
	return !(has_neg && has_pos)

func _get_direction(position: Vector2, position_int: Vector2i) -> Vector2i:
	var bottom_y = position_int.y * Globals.CELL_SIZE
	var left_x = position_int.x * Globals.CELL_SIZE
	var right_x = (position_int.x+1) * Globals.CELL_SIZE
	var top_y = (position_int.y + 1) * Globals.CELL_SIZE
	var div_part = 3.5
	var bottom_rect = Rect2(left_x, bottom_y, Globals.CELL_SIZE, Globals.CELL_SIZE / div_part)
	var top_rect = Rect2(left_x, top_y - Globals.CELL_SIZE / div_part, Globals.CELL_SIZE, Globals.CELL_SIZE / div_part)
	var left_rect = Rect2(left_x, bottom_y, Globals.CELL_SIZE / div_part, Globals.CELL_SIZE)
	var right_rect = Rect2(right_x - Globals.CELL_SIZE / div_part , bottom_y , Globals.CELL_SIZE / div_part, Globals.CELL_SIZE)
	
	var in_top = top_rect.has_point(position)
	var in_bottom = bottom_rect.has_point(position)
	var in_left = left_rect.has_point(position)
	var in_right = right_rect.has_point(position)
	
	if in_bottom:
		if in_left and previous_mouse_direction == Vector2i.LEFT:
			return Vector2i.LEFT
		if in_right and previous_mouse_direction == Vector2i.RIGHT:
			return Vector2i.RIGHT
		return Vector2i.UP
	elif in_top:
		if in_left and previous_mouse_direction == Vector2i.LEFT:
			return Vector2i.LEFT
		if in_right and previous_mouse_direction == Vector2i.RIGHT:
			return Vector2i.RIGHT
		return Vector2i.DOWN
	elif in_left:
		return Vector2i.LEFT
	elif in_right:
		return Vector2i.RIGHT
	return Vector2i.ZERO

func _on_generate_button_pressed() -> void:
	var map_array = Utils.map_to_coors(Utils.make_maze())
	map.clear()
	for x in len(map_array):
		for y in len(map_array[x]):
			map.set_cell(Vector2i(x,y), 3, map_array[x][y])


func _on_clear_button_pressed() -> void:
	var all_cells = map.get_used_cells()
	for cell in all_cells:
		map.set_cell(cell, 3, Vector2i(0,0))

func _on_h_split_container_gui_input(event: InputEvent) -> void:
	print('Mouse click')
