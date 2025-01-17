import { Request, Response } from 'express';
import { sanitizeUserData, UNAVAILABLE_USER, User } from '../core/db/schemas/User.model';
import { Friendship, FriendshipData, getFriendship, getUserFriendRequests, getUserFriends, usersHaveFriendshipRecord } from '../core/db/schemas/Friendship.model';
import { validateAuthenticationToken } from '../core/auth/auth';
import { liveServer } from '..';

export const handleGetFriends = async (req: Request, res: Response) => {
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

  // Get the user's friends
  const rawFriends = await getUserFriends(user);
  const clientFriendList: any[] = [];
  for (const friendship of rawFriends) {
    const result = {
      initiator: UNAVAILABLE_USER,
      recipient: UNAVAILABLE_USER,
      accepted: friendship.accepted,
      sentAt: friendship.sentAt,
      acceptedAt: friendship.acceptedAt,
    };

    result.initiator = sanitizeUserData(await User.findById(friendship.initiator) || UNAVAILABLE_USER);
    result.recipient = sanitizeUserData(await User.findById(friendship.recipient) || UNAVAILABLE_USER);

    clientFriendList.push(result);
  }
  res.status(200).send({
    message: `Successfully retrieved friends`,
    friends: clientFriendList,
  });
}

export const handleGetFriendRequests = async (req: Request, res: Response) => {
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

  // Get the user's friend requests
  const rawFriendRequests = await getUserFriendRequests(user);
  const clientFriendRequestList: any[] = [];
  for (const friendship of rawFriendRequests) {
    const result = {
      _id: friendship._id,
      initiator: UNAVAILABLE_USER,
      recipient: UNAVAILABLE_USER,
      accepted: friendship.accepted,
      sentAt: friendship.sentAt,
      acceptedAt: friendship.acceptedAt,
    };

    result.initiator = sanitizeUserData(await User.findById(friendship.initiator) || UNAVAILABLE_USER);
    result.recipient = sanitizeUserData(await User.findById(friendship.recipient) || UNAVAILABLE_USER);

    clientFriendRequestList.push(result);
  }
  res.status(200).send({
    message: `Successfully retrieved friend requests`,
    friendRequests: clientFriendRequestList,
  });
}

export const handleCreateFriendRequest = async (req: Request, res: Response) => {
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

  // If the request body doesn't contain the other user's username
  if (!req.body.recipient || !(typeof req.body.recipient === 'string')) {
    return res.status(400).send({
      message: `Failed to create friend request: recipient username not specified.`,
    });
  }

  const recipient = await User.findOne({ username: req.body.recipient });
  // If the other user doesn't exist
  if (!recipient) {
    return res.status(400).send({
      message: `Recipient user doesn't exist.`,
    });
  }

  // If the users already have a pending or canceled friendship request
  if (await usersHaveFriendshipRecord(user, recipient)) {
    return res.status(400).send({
      message: `Already pending friend request or existing friendship between specified users.`,
    });
  }

  // Create a new friend request
  const friendship = await Friendship.create({
    initiator: user._id,
    recipient: recipient._id,
  });

  // Return the friend request ID to the user
  return res.status(200).send({
    message: `Successfully created friend request.`,
    requestId: friendship._id,
  });
}

export const handleAcceptFriendRequest = async (req: Request, res: Response) => {
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

  // If the request body doesn't contain the request ID
  if (!req.body.request || !(typeof req.body.request === 'string')) {
    return res.status(400).send({
      message: `Failed to accept friend request: request ID not specified.`,
    });
  }

  const friendship = await Friendship.findById(req.body.request);
  if (!friendship) {
    return res.status(400).send({
      message: `Invalid friend request ID.`,
    });
  }
  if (user._id.toString() !== friendship.recipient.toString() || friendship.accepted) {
    return res.status(401).send({
      message: `User not eligible to accept request.`,
    });
  }

  // Accept the request
  friendship.accepted = true;
  friendship.acceptedAt = new Date();
  await friendship.save();
  return res.status(200).send({
    message: `Successfully updated friendship request`,
    friendship,
  });
}

export const handleDeclineFriendRequest = async (req: Request, res: Response) => {
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

  // If the request body doesn't contain the request ID
  if (!req.body.request || !(typeof req.body.request === 'string')) {
    return res.status(400).send({
      message: `Failed to decline friend request: request ID not specified.`,
    });
  }

  const friendship = await Friendship.findById(req.body.request);
  if (!friendship) {
    return res.status(400).send({
      message: `Invalid friend request ID.`,
    });
  }
  if (user._id.toString() !== friendship.recipient.toString() || friendship.accepted) {
    return res.status(401).send({
      message: `User not eligible to decline request.`,
    });
  }

  // Delete the request
  await friendship.deleteOne();
  return res.status(200).send({
    message: `Successfully declined friendship request`,
  });
}

export const handleRemoveFriend = async (req: Request, res: Response) => {
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

  // If the request body doesn't contain the other user's ID
  if (!req.body.friend || !(typeof req.body.friend === 'string')) {
    return res.status(400).send({
      message: `Failed to remove friend: friend ID not specified.`,
    });
  }

  const friend = await User.findById(req.body.friend);
  // If the other user doesn't exist
  if (!friend) {
    return res.status(400).send({
      message: `Friend's account doesn't exist.`,
    });
  }

  const friendship = await getFriendship(user, friend);
  if (!friendship || !friendship.accepted) {
    return res.status(400).send({
      message: `Users aren't friends.`,
    });
  }

  // Delete the friendship
  await friendship.deleteOne();
  return res.status(200).send({
    message: `Successfully removed friend.`,
  });
}

export const handleGetFriendGames = async (req: Request, res: Response) => {
  const token = req.header('Authtoken');
  if (!token) {
    return res.status(401).send({
      message: `Must be logged in to perform this action.`
    });
  }
  const { user, success } = await validateAuthenticationToken(token);
  if (!success || !user) {
    return res.status(401).send({
      message: `Must be logged in to perform this action.`,
    });
  }

  // Get the list of friendships involving this user
  const friends = await getUserFriends(user);
  // Convert it to a list of user IDs
  const friendIds = [];
  for (const f of friends) {
    if (f.recipient.toString() === user._id.toString()) friendIds.push(f.initiator.toString());
    else friendIds.push(f.recipient.toString());
  }
  // Get the list of games friends are currently in
  const friendGames = liveServer.gameManager.getGamesWithPlayers(friendIds);

  // Return the list to the client
  return res.status(200).send({
    message: `Successfully retreived friend games.`,
    friendGames,
  });
}