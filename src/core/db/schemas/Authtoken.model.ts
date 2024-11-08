import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const AUTH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60 * 1000;

export interface AuthtokenData {
  // The user that this token authenticates
  user: mongoose.Types.ObjectId;
  // The token
  token: string;
  // When the token expires
  expires: Date;
}

// Create a schema using the interface
const AuthtokenSchema = new mongoose.Schema<AuthtokenData>({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true, default: uuidv4() },
  expires: { type: Date, required: true, default: (Date.now() + AUTH_TOKEN_LIFESPAN), },
});

// Create a model using the schema and interface
export const Authtoken = mongoose.model<AuthtokenData>('Authtoken', AuthtokenSchema);