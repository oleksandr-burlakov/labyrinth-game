extends Node

const N = 1
const E = 2
const S = 4
const W = 8

var coordinates = [Vector2i(0,0),Vector2i(1,0),Vector2i(2,0),Vector2i(3,0),
	Vector2i(0,1),Vector2i(1,1),Vector2i(2,1),Vector2i(3,1),
	Vector2i(0,2),Vector2i(1,2),Vector2i(2,2),Vector2i(3,2),
	Vector2i(0,3),Vector2i(1,3),Vector2i(2,3),Vector2i(3,3) 
	]

var cell_walls = {Vector2i(1, 0): E, Vector2i(-1, 0): W,
				  Vector2i(0, 1): S, Vector2i(0, -1): N}

var tile_size = 64  # tile size (in pixels)
var width = 10  # width of map (in tiles)
var height = 10  # height of map (in tiles)

func _check_neighbors(cell, unvisited):
	# returns an array of cell's unvisited neighbors
	var list = []
	for n in cell_walls.keys():
		if cell + n in unvisited:
			list.append(cell + n)
	return list

func make_maze():
	var unvisited = []  # array of unvisited tiles
	var stack = []
	# fill the map with solid tiles
	var map_array = []
	for x in range(width):
		var temp_array = []
		for y in range(height):
			unvisited.append(Vector2i(x, y))
			temp_array.push_back(N|E|S|W)
		map_array.push_back(temp_array)
	var current = Vector2i(0, 0)
	unvisited.erase(current)
	while unvisited:
		var neighbors = _check_neighbors(current, unvisited)
		if neighbors.size() > 0:
			var next = neighbors[randi() % neighbors.size()]
			stack.append(current)
			# remove walls from *both* cells
			var dir = next - current
			map_array[current.x][current.y] = map_array[current.x][current.y] - cell_walls[dir]
			map_array[next.x][next.y] = map_array[next.x][next.y] - cell_walls[-dir]
			current = next
			unvisited.erase(current)
		elif stack:
			current = stack.pop_back()
	
	#left
	var left_y = randi_range(0,9)
	var left_walls = 0;
	if left_y == 0:
		left_walls |= N
	if left_y == 9:
		left_walls |= S
	map_array[0][left_y] = left_walls
	#top
	var top_x = randi_range(0,9)
	var top_wall = 0;
	if top_x == 0:
		top_wall |= W
	if top_x == 9:
		top_wall |= E
	map_array[top_x][0] = top_wall
	#right
	var right_y = randi_range(0,9)
	var right_wall = 0;
	if right_y == 0:
		right_wall |= N
	if right_y == 9:
		right_wall |= S
	map_array[9][right_y] = right_wall
	#bottom
	var bottom_x = randi_range(0,9)
	var bottom_wall = 0;
	if bottom_x == 0:
		bottom_wall |= W
	if bottom_x == 9:
		bottom_wall |= E
	map_array[bottom_x][9] = bottom_wall
	return map_array

func map_to_coors(map_array):
	var coor_array = []
	for x in len(map_array):
		var temp_array = []
		for y in len(map_array[x]):
			temp_array.push_back(coordinates[map_array[x][y]])
		coor_array.push_back(temp_array)
	return coor_array

func get_wall_from_cords(coords: Vector2i):
	return coordinates.find(coords)

func dir_to_coor(direction):
	return coordinates[direction]

func vector_to_dir(vector):
	return cell_walls[vector]
