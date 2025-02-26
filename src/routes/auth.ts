import { authenticateUser, validateAuthenticationToken } from '../core/auth/auth';

import { hashSync as hashPassword, compareSync as comparePassword } from 'bcrypt';

import { Request, Response } from 'express';
import { User } from '../core/db/schemas/User.model';
import { Authtoken, AUTH_TOKEN_LIFESPAN } from '../core/db/schemas/Authtoken.model';
import { logger } from '../utils/logger';

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

const validatePassword = (password: string): boolean => {
  return (password.length >= 5 && password.length <= 256);
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
  return res.status(200).cookie('ROG_AUTH_TOKEN', authResult.authtoken.token, { maxAge: AUTH_TOKEN_LIFESPAN }).send({
    message: `Authentication successful.`,
    token: authResult.authtoken.token,
    tokenExpires: authResult.authtoken.expires,
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
    logger.debug(`[AUTH] Couldn't create account: Signup parameters not provided or incorrect formats.`);
    return res.status(400).send({
      message: `Signup parameters not provided or incorrect formats.`,
    });
  }

  // If the username doesn't meet the criteria
  if (!validateUsername(req.body.username)) {
    logger.debug(`[AUTH] Couldn't create account: Invalid username. Must be 3-32 characters and alphanumeric.`);
    return res.status(400).send({
      message: `Invalid username. Must be 3-32 characters and alphanumeric.`,
    });
  }
  // If the email doesn't meet the criteria
  if (!validateEmail(req.body.email)) {
    logger.debug(`[AUTH] Couldn't create account: Invalid email. Must conform to RFC 5322.`);
    return res.status(400).send({
      message: `Invalid email. Must conform to RFC 5322.`,
    });
  }
  // If the password doesn't meet the criteria
  if (!validatePassword(req.body.password)) {
    logger.debug(`[AUTH] Couldn't create account: Invalid password. Must be between 5 and 256 characters long.`);
    return res.status(400).send({
      message: `Invalid password. Must be between 5 and 256 characters long.`,
    });
  }

  // Check if the username is already in use
  let existingUser = await User.findOne({ username: { $regex: new RegExp(`^${req.body.username}$`, 'i') }}).exec();
  if (existingUser !== null) {
    logger.debug(`[AUTH] Couldn't create account: Username is already in use.`);
    return res.status(400).send({
      message: `Username already in use.`,
    });
  }
  // Check if the email is already in use
  existingUser = await User.findOne({ email: { $regex: new RegExp(`^${req.body.email}$`, 'i') }}).exec();
  if (existingUser !== null) {
    logger.debug(`[AUTH] Couldn't create account: Email is already in use.`);
    return res.status(400).send({
      message: `Email already in use.`,
    });
  }

  // Create the new user
  const user = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: hashPassword(req.body.password, PASSWORD_SALT_ROUNDS),
  });
  const authtoken = await Authtoken.create({
    user: user,
  });

  // Authentication successful
  logger.info(`[AUTH] Created new account with username ${user.username}.`);
  return res.status(200).cookie('ROG_AUTH_TOKEN', authtoken.token).send({
    message: `Authentication successful.`,
    token: authtoken.token,
    tokenExpires: authtoken.expires,  
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

export const handleChangePassword = async (req: Request, res: Response) => {
  // Verify that the user is logged in
  const token = req.header('Authtoken');
  if (!token) {
    return res.status(401).send({
      message: `Must be logged in to perform this action.`
    });
  }
  const { user, success } = await validateAuthenticationToken(token);
  if (!success || !user) {
    return res.status(401).send({
      message: `Must be logged in to perform this action`,
    });
  }

  // Verify the request data
  if (!('oldPassword' in req.body) || !('newPassword' in req.body) ||
    !(typeof req.body.oldPassword === 'string') ||
    !(typeof req.body.newPassword === 'string') ||
    !validatePassword(req.body.newPassword)
  ) {
    return res.status(401).send({
      message: `Request to change password must contain old and new password. New password must be between 5 and 256 characters.`,
    });
  }

  // Verify the old password
  const oldPasswordCorrect = comparePassword(req.body.oldPassword, user.password);

  // If the password was incorrect
  if (!oldPasswordCorrect) {
    return res.status(401).send({
      message: `Couldn't reset password; old password incorrect`,
    });
  }

  // Set the user's new password
  user.password = hashPassword(req.body.newPassword, PASSWORD_SALT_ROUNDS);
  await user.save();
  
  // Success
  return res.status(200).send({
    message: `Successfully changed password.`,
  });
}

export const handleValidateAuthtoken = async (req: Request, res: Response) => {
  // Verify that the user is logged in
  const token = req.header('Authtoken');
  if (!token) {
    return res.status(401).send({
      message: `Authtoken invalid: none provided.`
    });
  }
  const { user, success } = await validateAuthenticationToken(token);
  if (!success || !user) {
    return res.status(401).send({
      message: `Authtoken invalid.`,
    });
  }

  // Return success
  return res.status(200).send({
    message: `Authtoken is valid.`,
  });
}