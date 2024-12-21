# Rothkopf Online Games  Server

This repository holds the TypeScript code for the server.

It includes the [API routes](src/routes) which handle [authentication](src/core/auth), [friending](src/core/schemas/Friendship.model.ts), and potential future systems like clubs or group chats.

It also includes the Socket.IO [server handlers](src/core/live) and the [game engine](src/core/engine).

## Components

| Name                      | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| [core](src/core)          | The core modules of the server, contain logic swappable between APIs |
| [auth](src/core/auth)     | Authentication and signup handling                                   |
| [db](src/core/db)         | Database interfacing and models                                      |
| [games](src/core/games)   | Game logic and networking                                            |
| [live](src/core/live)     | Socket management and networking                                     |
| [routes](src/routes)      | REST API routes for friending and authentication                     |
| [utils](src/utils)        | Utility functions for debugging and storing configuration            |

## Technologies and Stack

The game server uses TypeScript, Express.JS, MongoDB with Mongoose, and Socket.IO as its primary dependencies.

It uses Winston for logging.

This stack allows the server to clearly separate its live and REST routes and promotes rapid but stable development.

Using the core structure, developers can add new games and features without extensively modifying existing code.

### Application Flow

When the user first opens the website, it prompts them to log in or make an account.

The [authentication module](src/core/auth) handles this process and all of its related validations.

Once the user has made an account, they are redirected to the home page, which establishes a [socket connection](src/core/live) with the server.

Through this connection, the user can interact with [the gaming interface](src/core/games). The home page allows users to create and join games.

The home page also requests friendship data through the REST API. It displays these data in boxes and live-updates as players add and remove friends.

When a user decides to create a live match, the [game manager](src/core/games/GameManager.ts) runs the required checks and then starts a new game, redirecting the user to the waiting screen.

Using the join code it returns, other users can join the live game. Once it has enough players, the host can begin the game.

As soon as the game begins, the user is redirected to that game's page, which adds the game-specific listeners and manages game state parity.

On the server side, the game manager hands control of the game loop to an asynchronously threaded instance of the game's [class](src/core/games/Game.ts), which sends state updates to the clients as the game progresses.

When the host wishes to end the game, the game manager sends the termination code to all clients and the client redirects the users back to the home page.

### Database Structure

The database consists of three models: Authtoken, Friendship, and User.

[Authtoken](src/core/db/schemas/Authtoken.model.ts) handles the client's authentication state. It references a specific user and contains a UUIDv4-type token, which the client can use to log in without re-entering their password before the expiration date that it also specifies.

[Friendship](src/core/db/schemas/Friendship.model.ts) represents a friendship between two users. It simultaneously represents an active friend request with its "accepted" property set to false by default. Once the request is accepted, it turns to true.

The Friendship model also contains helper functions for retrieving users' friend lists and friend requests.

[User](src/core/db/schemas/User.model.ts) stores the user data that ROG needs to function. Most of these fields are standard, but it has two special features: a "locked" field, representing whether a site administrator has locked the user's account, preventing a login, and "lastLogin"/"lastLogout" Date fields which will, in the future, allow other users to see if their friends are online. (This feature will be most useful once I've added messaging.)