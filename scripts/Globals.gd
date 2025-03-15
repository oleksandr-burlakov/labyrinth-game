extends Node

var BOMBS = 3
var STEPS = 0
signal made_new_step()
signal bomb_updated()

func changeSteps(steps: int):
	STEPS = steps
	emit_signal("made_new_step")

func updateBombs(bombs: int):
	BOMBS = bombs
	emit_signal("bomb_updated")
