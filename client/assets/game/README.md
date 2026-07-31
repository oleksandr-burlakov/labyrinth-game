# Game artwork uploads

Add transparent square PNG or WebP files to this folder. A 256 x 256 source image with a little transparent padding is recommended. Images are optional: when a file is absent, the game uses its current coloured symbol or marker instead.

## Base files

Upload these names when artwork is ready:

- `player.png`
- `treasure.png`
- `walking_stick.png`
- `crossbow.png`
- `pirate_glass.png`
- `bear_trap.png`

## Optional variants

Use `<name>.board.png` for maze artwork and `<name>.inventory.png` for inventory/palette artwork. The base file is used when a variant is absent. Player markers also support `player.explorer.png` and `player.observer.png`.

WebP is supported with the same names. When both PNG and WebP exist for the same variant, PNG is used.

## Looping animation frames

Use numbered files to make any artwork loop: `treasure.1.png`, `treasure.2.png`, `treasure.3.png`. Frames play in numeric order at 5 frames per second and loop forever. Variants work the same way, for example `pirate_glass.inventory.1.png` and `pirate_glass.inventory.2.png`. A single base or variant image remains static.
