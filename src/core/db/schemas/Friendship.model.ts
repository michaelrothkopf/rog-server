import mongoose, { HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { UserData } from './User.model';

export const AUTH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60 * 1000;

export interface FriendshipData {
  // The person who initiated the friend request
  initiator: mongoose.Types.ObjectId,
  // The person who is receiving the friend request
  recipient: mongoose.Types.ObjectId,
  // The status of the request
  accepted: boolean,
  // The date the friend request was sent
  sentAt: Date,
  // The date the friend request was accepted
  acceptedAt: Date,
}

// Create a schema using the interface
const FriendshipSchema = new mongoose.Schema<FriendshipData>({
  initiator: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  accepted: { type: mongoose.Schema.Types.Boolean, required: true, default: false },
  sentAt: { type: mongoose.Schema.Types.Date, required: true, default: new Date() },
  acceptedAt: { type: mongoose.Schema.Types.Date, required: true, default: new Date('January 1, 2000 00:00:00') },
});

// Create a model using the schema and interface
export const Friendship = mongoose.model<FriendshipData>('Friendship', FriendshipSchema);

/**
 * Checks if the users have a friendship record even if not accepted
 * @param a The first user
 * @param b The second user
 * @returns Whether the users have a friendship record
 */
export const usersHaveFriendshipRecord = async (a: HydratedDocument<UserData>, b: HydratedDocument<UserData>): Promise<boolean> => {
  const friendship = await Friendship.findOne({
    $or: [
      { initiator: a._id, recipient: b._id },
      { initiator: b._id, recipient: a._id },
    ]
  });
  return !!friendship;
}

/**
 * Checks if the users have an active friendship
 * @param a The first user
 * @param b The second user
 * @returns Whether the users have a friendship record
 */
export const usersAreFriends = async (a: HydratedDocument<UserData>, b: HydratedDocument<UserData>): Promise<boolean> => {
  const friendship = await Friendship.findOne({
    accepted: true,
    $or: [
      { initiator: a._id, recipient: b._id },
      { initiator: b._id, recipient: a._id },
    ]
  });
  return !!friendship;
}

/**
 * Retrieves two users' friendship
 * @param a The first user
 * @param b The second user
 * @returns The friendship if it exists (accepted or not), otherwise null
 */
export const getFriendship = async (a: HydratedDocument<UserData>, b: HydratedDocument<UserData>): Promise<HydratedDocument<FriendshipData> | null> => {
  const friendship = await Friendship.findOne({
    $or: [
      { initiator: a._id, recipient: b._id },
      { initiator: b._id, recipient: a._id },
    ]
  });
  return friendship;
}

/**
 * Lists all friendships for a user
 * @param user 
 * @returns An array of Friendship objects representing the user's accepted friendships
 */
export const getUserFriends = async (user: HydratedDocument<UserData>): Promise<HydratedDocument<FriendshipData>[]> => {
  const friendships = await Friendship.find({
    accepted: true,
    $or: [
      { initiator: user._id },
      { recipient: user._id },
    ]
  });
  return friendships;
}

/**
 * Lists all incoming friend requests for a user
 * @param user 
 * @returns An array of Friendship objects representing the user's unaccepted friendships
 */
export const getUserFriendRequests = async (user: HydratedDocument<UserData>): Promise<HydratedDocument<FriendshipData>[]> => {
  const friendRequests = await Friendship.find({
    accepted: false,
    $or: [
      { recipient: user._id },
    ]
  });
  return friendRequests;
}