import { HydratedDocument } from 'mongoose';
import { UserData, User } from '../db/schemas/User.model';
import { AuthtokenData, Authtoken } from '../db/schemas/Authtoken.model';

import { compareSync as comparePassword } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface AuthResult {
  success: boolean;
  user: HydratedDocument<UserData> | null;
  authtoken: HydratedDocument<AuthtokenData> | null;
  message?: string;
}

/**
 * Authenticates a user based on a username and password
 * @param username The user's username
 * @param password The inputted password
 * @returns An AuthResult type object containing success status and the user object if found
 */
export const authenticateUser = async (username: string, password: string): Promise<AuthResult> => {
  // Get the user
  const user: HydratedDocument<UserData> | null = await User.findOne({ username: username }).exec();

  // If the user doesn't exist
  if (!user) {
    return { success: false, user: null, authtoken: null, message: `User doesn't exist.` };
  }

  // If the user is locked
  if (user.locked) {
    return { success: false, user: user, authtoken: null, message: `User locked.` };
  }

  const passwordMatches = comparePassword(password, user.password);
  // If the password doesn't match
  if (!passwordMatches) {
    return { success: false, user: user, authtoken: null, message: `Incorrect password.` };
  }

  // Delete previous authentication tokens matching the user
  await Authtoken.deleteMany({ user: user }).exec();
  // The password matches, create an authentication token
  const authtoken = await Authtoken.create({
    user: user,
    token: uuidv4(),
  });
  // Return the authentication data
  return { success: true, user: user, authtoken: authtoken, message: `Successful authentication.` };
}

/**
 * Validates an authentication token string
 * @param token The authentication token string to validate
 * @returns The authentication state of the user
 */
export const validateAuthenticationToken = async (token: string): Promise<AuthResult> => {
  // Get the auth token
  const authtoken: HydratedDocument<AuthtokenData> | null = await Authtoken.findOne({ token: token }).exec();

  // If the auth token doesn't exist
  if (!authtoken) {
    return { success: false, user: null, authtoken: null, message: `Authtoken doesn't exist.` };
  }

  // If the auth token is expired
  if (authtoken.expires < new Date()) {
    return { success: false, user: null, authtoken: authtoken, message: `Authtoken is expired.` };
  }

  // Get the user
  const user: HydratedDocument<UserData> | null = await User.findOne({ _id: authtoken.user }).exec();

  // If the user doesn't exist
  if (!user) {
    return { success: false, user: null, authtoken: authtoken, message: `User doesn't exist.` };
  }

  // If the user is locked
  if (user.locked) {
    return { success: false, user: user, authtoken: authtoken, message: `User locked.` };
  }

  // Return the authentication data
  return { success: true, user: user, authtoken: authtoken, message: `Successful authentication.` };
}