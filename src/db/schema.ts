import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Users table with uid as primary key (from Firebase Auth)
export const users = pgTable('users', {
  username: text('username').primaryKey(), // Using username/uid as primary key
  uid: text('uid').unique(), // Firebase Auth UID if available
  displayName: text('display_name').notNull(),
  mobile: text('mobile').unique(),
  bio: text('bio').default(''),
  avatar: text('avatar').notNull(),
  joinedDate: timestamp('joined_date').defaultNow(),
});

// Tweets table
export const tweets = pgTable('tweets', {
  id: text('id').primaryKey(),
  username: text('username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  originalTweetId: text('original_tweet_id'), // For reposts
});

// Loves table (many-to-many relationship for likes/loves on tweets)
export const loves = pgTable('loves', {
  id: text('id').primaryKey(),
  tweetId: text('tweet_id').references(() => tweets.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Comments table
export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  tweetId: text('tweet_id').references(() => tweets.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Comment Likes table
export const commentLikes = pgTable('comment_likes', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chirkuts table (private messages)
export const chirkuts = pgTable('chirkuts', {
  id: text('id').primaryKey(),
  senderUsername: text('sender_username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  receiverUsername: text('receiver_username').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  isDelivered: boolean('is_delivered').default(true).notNull(),
});

// Friendships table
export const friendships = pgTable('friendships', {
  id: text('id').primaryKey(),
  sender: text('sender').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  receiver: text('receiver').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull(), // 'pending', 'accepted'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  username: text('username').references(() => users.username, { onDelete: 'cascade' }).notNull(), // recipient
  type: text('type').notNull(), // 'friend_request', 'friend_accepted', 'new_chirkut', 'tweet_love', 'tweet_comment', 'tweet_repost'
  sender: text('sender').references(() => users.username, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  details: text('details').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  tweetId: text('tweet_id'),
});

// Define relations for drizzle queries
export const usersRelations = relations(users, ({ many }) => ({
  tweets: many(tweets),
  loves: many(loves),
  comments: many(comments),
  sentChirkuts: many(chirkuts, { relationName: 'sentChirkuts' }),
  receivedChirkuts: many(chirkuts, { relationName: 'receivedChirkuts' }),
  sentFriendRequests: many(friendships, { relationName: 'sentFriendships' }),
  receivedFriendRequests: many(friendships, { relationName: 'receivedFriendships' }),
  notifications: many(notifications),
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  author: one(users, {
    fields: [tweets.username],
    references: [users.username],
  }),
  loves: many(loves),
  comments: many(comments),
}));

export const lovesRelations = relations(loves, ({ one }) => ({
  tweet: one(tweets, {
    fields: [loves.tweetId],
    references: [tweets.id],
  }),
  user: one(users, {
    fields: [loves.username],
    references: [users.username],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  tweet: one(tweets, {
    fields: [comments.tweetId],
    references: [tweets.id],
  }),
  author: one(users, {
    fields: [comments.username],
    references: [users.username],
  }),
}));

export const chirkutsRelations = relations(chirkuts, ({ one }) => ({
  sender: one(users, {
    fields: [chirkuts.senderUsername],
    references: [users.username],
    relationName: 'sentChirkuts',
  }),
  receiver: one(users, {
    fields: [chirkuts.receiverUsername],
    references: [users.username],
    relationName: 'receivedChirkuts',
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  senderUser: one(users, {
    fields: [friendships.sender],
    references: [users.username],
    relationName: 'sentFriendships',
  }),
  receiverUser: one(users, {
    fields: [friendships.receiver],
    references: [users.username],
    relationName: 'receivedFriendships',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.username],
    references: [users.username],
  }),
  senderUser: one(users, {
    fields: [notifications.sender],
    references: [users.username],
  }),
}));
