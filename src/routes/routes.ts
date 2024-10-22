import express from 'express';
import { handleLogin, handleSignup } from './auth';

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
}