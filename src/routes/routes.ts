import express from 'express';
import { handleLogin, handleSignup } from './auth';
import { handleAcceptFriendRequest, handleCreateFriendRequest, handleDeclineFriendRequest, handleGetFriendRequests, handleGetFriends, handleRemoveFriend } from './friends';

/**
 * Populates the Express application with the routes
 * @param app The application to add the routes to
 */
export const createRoutes = (app: express.Application) => {
  // Default ping route
  app.get('/ping', (req, res) => {
    res.status(200).send('Pong!');
  });

  // Authentication routes
  app.post('/auth/login', (req, res) => { handleLogin(req, res) });
  app.post('/auth/signup', (req, res) => { handleSignup(req, res) });

  // Friendship routes
  app.get('/friends', (req, res) => { handleGetFriends(req, res) });
  app.get('/friends/request', (req, res) => { handleGetFriendRequests(req, res) });
  app.post('/friends/request', (req, res) => { handleCreateFriendRequest(req, res) });
  app.put('/friends/request/accept', (req, res) => { handleAcceptFriendRequest(req, res) });
  app.put('/friends/request/decline', (req, res) => { handleDeclineFriendRequest(req, res) });
  app.delete('/friends', (req, res) => { handleRemoveFriend(req, res) });
}