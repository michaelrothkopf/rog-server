import { HydratedDocument } from 'mongoose';
import { IUser, User } from '../db/schemas/User.model';
import { IAuthtoken, Authtoken } from '../db/schemas/Authtoken.model';

import { compareSync as comparePassword } from 'bcrypt';

export interface IAuthResult {
  success: boolean;
  user: HydratedDocument<IUser> | null;
  authtoken: HydratedDocument<IAuthtoken> | null;
  message?: string;
}

/**
 * Authenticates a user based on a username and password
 * @param username The user's username
 * @param password The inputted password
 * @returns An IAuthResult type object containing success status and the user object if found
 */
export const authenticateUser = async (username: string, password: string): Promise<IAuthResult> => {
  // Get the user
  const user: HydratedDocument<IUser> | null = await User.findOne({ username: username });

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

  // The password matches, create an authentication token
  const authtoken = await Authtoken.create({
    user: user
  });
  // Return the authentication data
  return { success: true, user: user, authtoken: authtoken, message: `Successful authentication.` };
}

/**
 * Validates an authentication token string
 * @param token The authentication token string to validate
 * @returns The authentication state of the user
 */
export const validateAuthenticationToken = async (token: string): Promise<IAuthResult> => {
  // Get the auth token
  const authtoken: HydratedDocument<IAuthtoken> | null = await Authtoken.findOne({ token: token });

  // If the auth token doesn't exist
  if (!authtoken) {
    return { success: false, user: null, authtoken: null, message: `Authtoken doesn't exist.` };
  }

  // If the auth token is expired
  if (authtoken.expires < new Date()) {
    return { success: false, user: null, authtoken: authtoken, message: `Authtoken is expired.` };
  }

  // Get the user
  const user: HydratedDocument<IUser> | null = await User.findOne({ _id: authtoken.user });

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