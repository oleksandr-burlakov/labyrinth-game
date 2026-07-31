# General overview

This is the web version of the game where you can generate maze and set up some items and play it with your friend. The idea is to keep it simple to deploy and to start playing.

What players can do:

- They can generate maze 10x10 grid cells (this is the main game scene). This maze will be used as maze for your oponent.
- Set up 4 treasures which should be pulled out from maze. And the first one who find and move all treasures out of maze is the winner.
- Moves are made in turn based oder. if you hit wall or move one cell your turn is ended and turn goes to the oponent.
- Each player start as player-object (human), and has ability to move in one of forth directions: north, south, west, east.

How Fog of War works:

- Maze are fully covered in fog of wwar.
- When player stay on some grid it sees only INNER space of grid clear without fog.
- When player navigate in some direction previous viewed space are not hidden anymore (which means everything that the player has found is revelead and not hide in fog)
- When player hit the wall (because wall is not INNER space of grid but borders and they are not simply visible if user simple stays on cell) then this wall becomes visible.

Items iteraction:

- When player steps over cell that has item this item goes to the inventory and passive effect (or penalty depends on the item) activates. This items will be along with player till the end of the game.
- Player can bear only one treasure at the time. When this treasure is moved outside of the maze then this treasure dissapear and player treasure count increases.

# TODOs:

## Connection section:

1. Ability to set room id
2. Another user can input room id and connect to the same room

## Autogenerate maze

1. Allow user to pregenerate maze
2. Allow user to draw maze
3. Allow user to set entrances

## Objects

1. Allow user to have menu with possible items to select:
   - Walking stick (+1 to the seeker)
   - Crossbox (+1 to the owner of the maze)
   - 4x treasures
   - Bear trap (wait 3 rounds)

## Play section

1. Turn based
2. Timer to act
3. Shadow of fog (only show in direction of movement if hit the wall)
