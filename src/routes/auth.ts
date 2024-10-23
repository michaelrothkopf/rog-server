import { authenticateUser } from '../core/auth/auth';

import { hashSync as hashPassword, hashSync } from 'bcrypt';

import { Request, Response } from 'express';
import { User } from '../core/db/schemas/User.model';
import { Authtoken } from '../core/db/schemas/Authtoken.model';

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 32;
const ALLOWED_USERNAME_CHARS = '[a-zA-Z0-9]';
const USERNAME_REGEX = new RegExp(`^${ALLOWED_USERNAME_CHARS}{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`);

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const PASSWORD_SALT_ROUNDS = 10;

const validateUsername = (username: string): boolean => {
  return USERNAME_REGEX.test(username);
}

const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
}

export const handleLogin = async (req: Request, res: Response) => {
  // If the request body doens't contain the required parameters
  if (!req.body.username || !req.body.password ||
      !(typeof req.body.username === 'string') ||
      !(typeof req.body.password === 'string')
  ) {
    return res.status(400).send({
      message: `Failed to authenticate: malformed request syntax. Does not contain (username: string, password: string) in body.`,
    });
  }

  // Attempt to authenticate the user
  const authResult = await authenticateUser(req.body.username, req.body.password);

  // If authentication failed
  if (!authResult.success) {
    return res.status(401).send({
      message: `Invalid authentication attempt: '${authResult.message}'`,
    });
  }

  // Making TS happy with just-in-case result checks
  if (!authResult.authtoken) {
    return res.status(500).send({
      message: `Error processing login request: invalid authentication token (server-side generation).'`,
    });
  }
  if (!authResult.user) {
    return res.status(500).send({
      message: `Error processing login request: invalid user (server retrieval).'`,
    });
  }

  // Authentication successful
  return res.status(200).cookie('NANGAM_AUTH_TOKEN', authResult.authtoken.token).send({
    message: `Authentication successful.`,
    token: authResult.authtoken.token,
    user: {
      _id: authResult.user._id,
      username: authResult.user.username,
      email: authResult.user.email,
      locked: authResult.user.locked,
      lastLogin: authResult.user.lastLogin,
      lastLogout: authResult.user.lastLogout,
    },
  });
}

export const handleSignup = async (req: Request, res: Response) => {
  // If the request body doens't contain the required parameters
  if (!req.body.username || !req.body.password ||
      !req.body.email ||
      !(typeof req.body.username === 'string') ||
      !(typeof req.body.password === 'string') ||
      !(typeof req.body.email === 'string')
  ) {
    return res.status(400).send({
      message: `Signup parameters not provided or incorrect formats.`,
    });
  }

  // If the username doesn't meet the criteria
  if (!validateUsername(req.body.username)) {
    return res.status(400).send({
      message: `Invalid username. Must be 3-32 characters and alphanumeric.`,
    });
  }
  // If the email doesn't meet the criteria
  if (!validateEmail(req.body.email)) {
    return res.status(400).send({
      message: `Invalid email. Must conform to RFC 5322.`,
    });
  }

  // Check if the username is already in use
  let existingUser = await User.findOne({ username: { $regex: new RegExp(`^${req.body.username}$`, 'i') }}).exec();
  if (existingUser !== null) {
    return res.status(400).send({
      message: `Username already in use.`,
    });
  }
  // Check if the email is already in use
  existingUser = await User.findOne({ email: { $regex: new RegExp(`^${req.body.email}$`, 'i') }}).exec();
  if (existingUser !== null) {
    return res.status(400).send({
      message: `Email already in use.`,
    });
  }

  // Create the new user
  const user = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: hashSync(req.body.password, PASSWORD_SALT_ROUNDS),
  });
  const authtoken = await Authtoken.create({
    user: user,
  });

  // Authentication successful
  return res.status(200).cookie('NANGAM_AUTH_TOKEN', authtoken.token).send({
    message: `Authentication successful.`,
    token: authtoken.token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      locked: user.locked,
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout,
    },
  });
}