extends CharacterBody2D

const step = 64

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

func move(vector: Vector2):
	var collision = move_and_collide(vector * step)
	position = snap_to_grid(position)
	GlobalSteps.emit_signal("made_new_step")

func snap_to_grid(position: Vector2) -> Vector2:
	return (position / step).floor() * step + Vector2(step/2, step/2)
