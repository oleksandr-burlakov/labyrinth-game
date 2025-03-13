extends TileMapLayer

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

# get a reference to the map for convenience
@onready var Map = self

func _ready():
	randomize()
	make_maze()
	
func check_neighbors(cell, unvisited):
	# returns an array of cell's unvisited neighbors
	var list = []
	for n in cell_walls.keys():
		if cell + n in unvisited:
			list.append(cell + n)
	return list

func get_wall_from_cords(coords: Vector2i):
	return coordinates.find(coords)

func make_maze():
	var unvisited = []  # array of unvisited tiles
	var stack = []
	# fill the map with solid tiles
	Map.clear()
	for x in range(width):
		for y in range(height):
			unvisited.append(Vector2i(x, y))
			Map.set_cell(Vector2i(x, y), 3, coordinates[N|E|S|W], 0)
	var current = Vector2i(0, 0)
	unvisited.erase(current)
	while unvisited:
		var neighbors = check_neighbors(current, unvisited)
		if neighbors.size() > 0:
			var next = neighbors[randi() % neighbors.size()]
			stack.append(current)
			# remove walls from *both* cells
			var dir = next - current
			var current_walls = get_wall_from_cords(Map.get_cell_atlas_coords(current)) - cell_walls[dir]
			var next_walls = get_wall_from_cords(Map.get_cell_atlas_coords(next)) - cell_walls[-dir]
			Map.set_cell(current, 3, coordinates[current_walls])
			Map.set_cell(next, 3, coordinates[next_walls])
			current = next
			unvisited.erase(current)
		elif stack:
			current = stack.pop_back()
	
	#left
	Map.set_cell(Vector2i(0, randi_range(0,9)), 3, Vector2i(0,0))
	#top
	Map.set_cell(Vector2i(randi_range(0,9), 0), 3, Vector2i(0,0))
	#right
	Map.set_cell(Vector2i(9, randi_range(0,9)), 3, Vector2i(0,0))
	#bottom
	Map.set_cell(Vector2i(randi_range(0,9), 9), 3, Vector2i(0,0))
