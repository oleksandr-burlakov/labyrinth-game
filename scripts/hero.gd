extends CharacterBody2D

const step = 64

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_UP:
			position.y -= step
		elif event.keycode == KEY_DOWN:
			position.y += step
		elif event.keycode == KEY_LEFT:
			position.x -= step
		elif event.keycode == KEY_RIGHT:
			position.x += step


func _physics_process(delta: float) -> void:

	# Get the input direction and handle the movement/deceleration.
	# As good practice, you should replace UI actions with custom gameplay actions.
	var x_direction := Input.get_axis("ui_left", "ui_right")
	var y_direction := Input.get_axis("ui_up", "ui_down")
	#if x_direction:
		#position.x += x_direction
	#if y_direction:
		#position.y += y_direction

	move_and_slide()
