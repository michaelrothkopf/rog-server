import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// TODO: Friend API routes: list friends, make request, accept request, decline request, remove friend
export const AUTH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60 * 1000;

export interface FriendshipData {
  // The person who initiated the friend request
  initiator: mongoose.Types.ObjectId,
  // The person who is receiving the friend request
  receiver: mongoose.Types.ObjectId,
  // Whether the request was accepted
  accepted: boolean,
  // The date the friend request was sent
  sentAt: Date,
  // The date the friend request was accepted
  acceptedAt: Date,
}

// Create a schema using the interface
const FriendshipSchema = new mongoose.Schema<FriendshipData>({
  initiator: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  accepted: { type: mongoose.Schema.Types.Boolean, required: true, default: false },
  sentAt: { type: mongoose.Schema.Types.Date, required: true, default: new Date() },
  acceptedAt: { type: mongoose.Schema.Types.Date, required: true, default: new Date('January 1, 2000 00:00:00') },
});

// Create a model using the schema and interface
export const Friendship = mongoose.model<FriendshipData>('Friendship', FriendshipSchema);