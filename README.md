# Game Platform Server

This repository holds the TypeScript code for the server.

It includes the [API routes](src/routes) which handle [authentication](src/core/auth), [friending](src/core/schemas/Friendship.model.ts), and potential future systems like clubs or group chats.

It also includes the Socket.IO [server handlers](src/core/live) and the [game engine](src/core/engine).

## Components

| Name                      | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| [core](src/core)          | The core modules of the server, contain logic swappable between APIs |
| [auth](src/core/auth)     | Authentication and signup handling                                   |
| [db](src/core/db)         | Database interfacing and models                                      |
| [engine](src/core/engine) | Game logic and networking                                            |
| [live](src/core/live)     | Socket management and networking                                     |
| [routes](src/routes)      | REST API routes                                                      |
| [utils](src/utils)        | Utility functions for debugging and storing configuration            |

## Technologies and Stack

The game server uses TypeScript, Express.JS, MongoDB with Mongoose, and Socket.IO as its primary dependencies.

It uses Winston for logging.

This stack allows the server to clearly separate its live and REST routes and promotes rapid but stable development.

Using the core structure, developers can add new games and features without extensively modifying existing code.

## Issues

This project uses issues to track in-development features, wishlists, and TODO items.
