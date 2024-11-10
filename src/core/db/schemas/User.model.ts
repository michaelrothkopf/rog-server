import mongoose from 'mongoose';

export interface UserData {
  _id: mongoose.Types.ObjectId,
  username: string,
  email: string,
  password: string,

  // Administrators can lock users' accounts via admin panel
  locked: boolean,

  // Someone is online if lastLogin > lastLogout
  lastLogin: Date,
  lastLogout: Date,
}

export interface ClientUserData {
  _id: mongoose.Types.ObjectId,
  username: string,
  email: string,

  // Administrators can lock users' accounts via admin panel
  locked: boolean,

  // Someone is online if lastLogin > lastLogout
  lastLogin: Date,
  lastLogout: Date,
}

export const UNAVAILABLE_USER: ClientUserData = {
  _id: new mongoose.Types.ObjectId('000000000000000000000000'),
  username: 'user_unavailable',
  email: 'unavailable@example.com',
  locked: false,
  lastLogin: new Date(),
  lastLogout: new Date(),
}

// Create a schema using the interface
const userSchema = new mongoose.Schema<UserData>({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },

  // Auth checks locked status at login; must be false to authenticate
  locked: { type: Boolean, required: true, default: false },

  lastLogin: { type: Date, required: true, default: Date.now() },
  // lastLogout defaults to before the creation of the app; users who just created an account will show as online
  lastLogout: { type: Date, required: true, default: new Date('January 1, 2000 00:00:00') },
});

// Create a model using the schema and interface
export const User = mongoose.model<UserData>('User', userSchema);

export const sanitizeUserData = (user: UserData | ClientUserData): ClientUserData => {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    locked: user.locked,
    lastLogin: user.lastLogin,
    lastLogout: user.lastLogout,
  };
}