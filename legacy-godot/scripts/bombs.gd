extends Label

func _ready() -> void:
	update_counter_of_bombs()
	Globals.connect("bomb_updated", Callable(self, "update_counter_of_bombs"))

func update_counter_of_bombs() -> void:
	self.text = "Bombs: " + str(Globals.BOMBS)
