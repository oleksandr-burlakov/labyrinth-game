extends Label

@onready var counter: int = 0

func _ready() -> void:
	GlobalSteps.connect("made_new_step", Callable(self, "update_counter"))

func update_counter() -> void:
	self.counter += 1
	self.text = "Made steps: " + str(self.counter)
