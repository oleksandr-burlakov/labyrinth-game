extends Label

@onready var counter: int = 0

func _ready() -> void:
	Globals.connect("made_new_step", Callable(self, "update_counter"))

func update_counter() -> void:
	self.counter = Globals.STEPS
	self.text = "Made steps: " + str(self.counter)
