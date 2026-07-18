/* eslint-disable */
import { Injectable, signal, computed } from '@angular/core';

export interface User {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  joinedDate: string;
  mobile?: string;
}

export interface Comment {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  createdAt: string;
  createdAtFormatted: string;
  likes: string[];
  likesCountFormatted: string;
}

export interface Tweet {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  createdAt: string;
  createdAtFormatted: string;
  loves: string[]; // usernames of lovers
  lovesCountFormatted: string;
  comments: Comment[];
  commentsCountFormatted: string;
  repostCount: number;
  repostCountFormatted: string;
  repostedBy?: string[];
  originalTweetId: string | null;
  originalTweetAuthor?: string;
  originalTweetContent?: string;
  originalTweetAvatar?: string;
  originalTweetDisplayName?: string;
}

export interface Chirkut {
  id: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  receiverUsername: string;
  receiverDisplayName: string;
  content: string;
  createdAt: string;
  createdAtFormatted: string;
  isRead: boolean;
  isDelivered: boolean;
}

export interface FriendRequest {
  requestId: string;
  username: string;
  displayName: string;
  avatar: string;
  createdAt?: string;
}

export interface Friend {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
}

export interface Notification {
  id: string;
  username: string;
  type: 'friend_request' | 'friend_accepted' | 'new_chirkut' | 'tweet_love' | 'tweet_comment' | 'tweet_repost';
  sender: string;
  senderDisplayName: string;
  senderAvatar: string;
  timestamp: string;
  timestampFormatted: string;
  details: string;
  isRead: boolean;
  tweetId?: string;
}

// ----------------------------------------------------
// Bengali Date and Digits Formatting Helpers
// ----------------------------------------------------
const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBanglaDigits(num: number | string): string {
  return String(num).replace(/\d/g, (digit) => banglaDigits[parseInt(digit, 10)]);
}

export function formatBanglaDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'এইমাত্র';
  if (diffMins < 60) return `${toBanglaDigits(diffMins)} মিনিট আগে`;
  
  if (diffHours < 24) {
    if (date.getDate() === now.getDate()) {
      const hour = date.getHours();
      const min = String(date.getMinutes()).padStart(2, '0');
      const period = hour < 6 ? 'শেষ রাত' : hour < 12 ? 'সকাল' : hour < 16 ? 'দুপুর' : hour < 19 ? 'বিকাল' : 'রাত';
      const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `আজ ${period} ${toBanglaDigits(formattedHour)}:${toBanglaDigits(min)}`;
    }
  }
  
  if (diffDays === 1 || (diffHours < 48 && date.getDate() === new Date(now.getTime() - 86400000).getDate())) {
    const hour = date.getHours();
    const min = String(date.getMinutes()).padStart(2, '0');
    const period = hour < 6 ? 'শেষ রাত' : hour < 12 ? 'সকাল' : hour < 16 ? 'দুপুর' : hour < 19 ? 'বিকাল' : 'রাত';
    const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `গতকাল ${period} ${toBanglaDigits(formattedHour)}:${toBanglaDigits(min)}`;
  }

  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return `${toBanglaDigits(date.getDate())} ${months[date.getMonth()]} ${toBanglaDigits(date.getFullYear())}`;
}

// Simple Client-side Password Hashing (Lightweight and secure-looking)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// ----------------------------------------------------
// LocalStorage Database Configuration & Seeding
// ----------------------------------------------------
interface StorageUser {
  username: string;
  passwordHash: string;
  displayName: string;
  mobile: string;
  bio: string;
  avatar: string;
  joinedDate: string;
}

interface StorageFriendship {
  id: string;
  sender: string;
  receiver: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(val) as T;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, data: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

const defaultUsers: StorageUser[] = [
  {
    username: 'chirkut_official',
    passwordHash: hashPassword('chitron@2448766'),
    displayName: 'চিরকুট অফিশিয়াল',
    mobile: '01945971168',
    bio: 'চিরকুট এর অফিসিয়াল বট। নতুন নতুন বন্ধুদের আমন্ত্রণ জানাতে প্রস্তুত ও প্ল্যাটফর্ম সংক্রান্ত নোটিফিকেশন পাঠাতে নিয়োজিত।',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366F1"/><stop offset="100%" stop-color="%234F46E5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g1)"/><path d="M25 35h50v30H25z" fill="none" stroke="white" stroke-width="4"/><path d="M25 35l25 18 25-18" fill="none" stroke="white" stroke-width="4"/></svg>',
    joinedDate: '2026-01-01T12:00:00Z'
  },
  {
    username: 'shakib',
    passwordHash: hashPassword('shakib123'),
    displayName: 'সাকিব হাসান',
    mobile: '01811111111',
    bio: 'প্রযুক্তিপ্রেমী ও চিরকুট প্ল্যাটফর্মের অন্যতম শুভাকাঙ্ক্ষী। নতুন নতুন ফিচার টেস্ট করতে ভালোবাসি।',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g2)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    joinedDate: '2026-05-12T09:30:00Z'
  },
  {
    username: 'rokeya',
    passwordHash: hashPassword('rokeya123'),
    displayName: 'রোকেয়া বেগম',
    mobile: '01922222222',
    bio: 'লেখালেখি করতে ভালোবাসি। চিরকুটে নতুন সুন্দর অভিজ্ঞতার খোঁজে এবং সুন্দর সব ডায়েরি এন্ট্রি করতে নিয়োজিত।',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23EC4899"/><stop offset="100%" stop-color="%23DB2777"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g3)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    joinedDate: '2026-06-20T15:45:00Z'
  },
  {
    username: 'arif',
    passwordHash: hashPassword('arif123'),
    displayName: 'আরিফ রহমান',
    mobile: '01533333333',
    bio: 'ডিজিটাল ডিজাইনার। চিরকুটের দৃষ্টিনন্দন ডিজাইন আমার খুবই ভালো লেগেছে। ইউআই-ইউএক্স আমার নেশা ও পেশা।',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g4)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    joinedDate: '2026-07-02T18:10:00Z'
  }
];

const defaultTweets: Tweet[] = [
  {
    id: 'tweet_1',
    username: 'chirkut_official',
    displayName: 'চিরকুট অফিশিয়াল',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366F1"/><stop offset="100%" stop-color="%234F46E5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g1)"/><path d="M25 35h50v30H25z" fill="none" stroke="white" stroke-width="4"/><path d="M25 35l25 18 25-18" fill="none" stroke="white" stroke-width="4"/></svg>',
    content: 'শুভকামনা চিরকুট প্ল্যাটফর্মে! বন্ধু ও প্রিয়জনদের সাথে ব্যক্তিগত চিঠি (চিরকুট) ও পাবলিক টুইট শেয়ার করতে থাকুন। ❤️ আপনার যেকোনো সুন্দর চিরকুট আমাদের সাথেও শেয়ার করতে পারেন।',
    createdAt: '2026-07-16T10:00:00Z',
    createdAtFormatted: '',
    loves: ['shakib', 'rokeya'],
    lovesCountFormatted: '২',
    comments: [
      {
        id: 'c_1',
        username: 'shakib',
        displayName: 'সাকিব হাসান',
        avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g2)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
        content: 'অসংখ্য ধন্যবাদ সুন্দর এই প্ল্যাটফর্মটির জন্য! দারুণ সব ফিচার রয়েছে এতে। 🥰',
        createdAt: '2026-07-16T10:15:00Z',
        createdAtFormatted: '',
        likes: ['chirkut_official'],
        likesCountFormatted: '১'
      }
    ],
    commentsCountFormatted: '১',
    repostCount: 0,
    repostCountFormatted: '০',
    originalTweetId: null
  },
  {
    id: 'tweet_2',
    username: 'shakib',
    displayName: 'সাকিব হাসান',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g2)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    content: 'চিরকুট প্ল্যাটফর্মের ডিজাইন সত্যি অসাধারণ! বিশেষ করে এর অফলাইন মেমোরি ও আধুনিক এস্থেটিক ইন্টারফেস আমার মন কেড়েছে। 😍',
    createdAt: '2026-07-16T18:30:00Z',
    createdAtFormatted: '',
    loves: ['rokeya', 'arif'],
    lovesCountFormatted: '২',
    comments: [
      {
        id: 'c_2',
        username: 'arif',
        displayName: 'আরিফ রহমান',
        avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g4)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
        content: 'সহমত ভাই! কালার প্যালেট আর শ্যাডোগুলো চমৎকার ডিজাইন সেন্স প্রদর্শন করে।',
        createdAt: '2026-07-16T19:00:00Z',
        createdAtFormatted: '',
        likes: ['shakib'],
        likesCountFormatted: '১'
      }
    ],
    commentsCountFormatted: '১',
    repostCount: 1,
    repostCountFormatted: '১',
    originalTweetId: null
  },
  {
    id: 'tweet_3',
    username: 'rokeya',
    displayName: 'রোকেয়া বেগম',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23EC4899"/><stop offset="100%" stop-color="%23DB2777"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g3)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    content: 'আজকের সকালটা খুব চমৎকার। চিরকুটের মাধ্যমে প্রিয় মানুষদের সুন্দর সুন্দর ডিজিটাল চিঠি বা চিরকুট পাঠাতে পেরে খুব ভালো লাগছে।',
    createdAt: '2026-07-17T06:00:00Z',
    createdAtFormatted: '',
    loves: ['shakib'],
    lovesCountFormatted: '১',
    comments: [],
    commentsCountFormatted: '০',
    repostCount: 0,
    repostCountFormatted: '০',
    originalTweetId: null
  }
];

const defaultFriendships: StorageFriendship[] = [
  { id: 'f_1', sender: 'chirkut_official', receiver: 'shakib', status: 'accepted', createdAt: '2026-07-15T00:00:00Z' },
  { id: 'f_2', sender: 'chirkut_official', receiver: 'rokeya', status: 'accepted', createdAt: '2026-07-15T00:00:00Z' },
  { id: 'f_3', sender: 'chirkut_official', receiver: 'arif', status: 'accepted', createdAt: '2026-07-15T00:00:00Z' },
  { id: 'f_4', sender: 'shakib', receiver: 'rokeya', status: 'accepted', createdAt: '2026-07-16T00:00:00Z' },
  { id: 'f_5', sender: 'arif', receiver: 'shakib', status: 'pending', createdAt: '2026-07-17T01:00:00Z' }
];

const defaultChirkuts: Chirkut[] = [
  {
    id: 'chk_1',
    senderUsername: 'chirkut_official',
    senderDisplayName: 'চিরকুট অফিশিয়াল',
    senderAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366F1"/><stop offset="100%" stop-color="%234F46E5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g1)"/><path d="M25 35h50v30H25z" fill="none" stroke="white" stroke-width="4"/><path d="M25 35l25 18 25-18" fill="none" stroke="white" stroke-width="4"/></svg>',
    receiverUsername: 'shakib',
    receiverDisplayName: 'সাকিব হাসান',
    content: 'প্রিয় সাকিব, চিরকুট প্ল্যাটফর্মে আপনাকে স্বাগতম! আমাদের প্ল্যাটফর্মের প্রথম চিঠি এটি। আশা করি বন্ধু ও প্রিয়জনদের সাথে সুন্দর কিছু চিরকুট বিনিময় করবেন। শুভকামনা!',
    createdAt: '2026-07-16T12:00:00Z',
    createdAtFormatted: '',
    isRead: false,
    isDelivered: true
  }
];

const defaultNotifications: Notification[] = [
  {
    id: 'notif_1',
    username: 'shakib',
    type: 'friend_request',
    sender: 'arif',
    senderDisplayName: 'আরিফ রহমান',
    senderAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g4)"/><circle cx="50" cy="38" r="16" fill="white"/><path d="M25 78c0-12 10-20 25-20s25 8 25 20z" fill="white"/></svg>',
    timestamp: '2026-07-17T01:00:00Z',
    timestampFormatted: '',
    details: 'আরিফ রহমান আপনাকে একটি বন্ধুত্বের অনুরোধ পাঠিয়েছেন।',
    isRead: false
  }
];

function initLocalDatabase(): void {
  const users = getStorageItem<StorageUser[]>('chirkut_db_users', defaultUsers);

  // Ensure chirkut_official always exists with correct credentials
  let adminUser = users.find(u => u.username === 'chirkut_official');
  if (adminUser) {
    adminUser.mobile = '01945971168';
    adminUser.passwordHash = hashPassword('chitron@2448766');
  } else {
    users.push({
      username: 'chirkut_official',
      passwordHash: hashPassword('chitron@2448766'),
      displayName: 'চিরকুট অফিশিয়াল',
      mobile: '01945971168',
      bio: 'চিরকুট এর অফিসিয়াল বট। নতুন নতুন বন্ধুদের আমন্ত্রণ জানাতে প্রস্তুত ও প্ল্যাটফর্ম সংক্রান্ত নোটিফিকেশন পাঠাতে নিয়োজিত।',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366F1"/><stop offset="100%" stop-color="%234F46E5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(%23g1)"/><path d="M25 35h50v30H25z" fill="none" stroke="white" stroke-width="4"/><path d="M25 35l25 18 25-18" fill="none" stroke="white" stroke-width="4"/></svg>',
      joinedDate: '2026-01-01T12:00:00Z'
    });
  }
  setStorageItem('chirkut_db_users', users);

  const tweets = getStorageItem<Tweet[]>('chirkut_db_tweets', defaultTweets);
  const friendships = getStorageItem<StorageFriendship[]>('chirkut_db_friendships', defaultFriendships);
  const chirkuts = getStorageItem<Chirkut[]>('chirkut_db_chirkuts', defaultChirkuts);
  const notifications = getStorageItem<Notification[]>('chirkut_db_notifications', defaultNotifications);

  // Auto self-repair: Strip any existing huge avatars in local storage arrays immediately
  let modifiedTweets = false;
  const cleanedTweets = tweets.map(t => {
    let tMod = false;
    if (t.avatar) { t.avatar = ''; tMod = true; }
    if (t.displayName) { t.displayName = ''; tMod = true; }
    if (t.originalTweetAvatar) { t.originalTweetAvatar = ''; tMod = true; }
    if (t.originalTweetDisplayName) { t.originalTweetDisplayName = ''; tMod = true; }
    const cleanedComments = t.comments ? t.comments.map(c => {
      let cMod = false;
      if (c.avatar) { c.avatar = ''; cMod = true; }
      if (c.displayName) { c.displayName = ''; cMod = true; }
      if (cMod) tMod = true;
      return c;
    }) : [];
    if (tMod) {
      modifiedTweets = true;
      t.comments = cleanedComments;
    }
    return t;
  });

  if (modifiedTweets) {
    setStorageItem('chirkut_db_tweets', cleanedTweets);
  }

  let modifiedChirkuts = false;
  const cleanedChirkuts = chirkuts.map(c => {
    let cMod = false;
    if (c.senderAvatar) { c.senderAvatar = ''; cMod = true; }
    if (c.senderDisplayName) { c.senderDisplayName = ''; cMod = true; }
    if (c.receiverDisplayName) { c.receiverDisplayName = ''; cMod = true; }
    if (cMod) modifiedChirkuts = true;
    return c;
  });
  if (modifiedChirkuts) {
    setStorageItem('chirkut_db_chirkuts', cleanedChirkuts);
  }

  let modifiedNotifications = false;
  const cleanedNotifications = notifications.map(n => {
    let nMod = false;
    if (n.senderAvatar) { n.senderAvatar = ''; nMod = true; }
    if (n.senderDisplayName) { n.senderDisplayName = ''; nMod = true; }
    if (nMod) modifiedNotifications = true;
    return n;
  });
  if (modifiedNotifications) {
    setStorageItem('chirkut_db_notifications', cleanedNotifications);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  token = signal<string | null>(null);
  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);

  // Global unread indicators
  unreadNotificationsCount = signal<number>(0);
  unreadChirkutsCount = signal<number>(0);

  constructor() {
    if (typeof window !== 'undefined') {
      initLocalDatabase();
      const savedToken = localStorage.getItem('chirkut_token');
      const savedUser = localStorage.getItem('chirkut_user');
      if (savedToken && savedUser) {
        this.token.set(savedToken);
        try {
          this.currentUser.set(JSON.parse(savedUser));
          this.verifyToken();
        } catch {
          this.logout();
        }
      }
    }
  }

  // ----------------------------------------------------
  // Mock Database Getters and Setters
  // ----------------------------------------------------
  private getUsers(): StorageUser[] {
    return getStorageItem<StorageUser[]>('chirkut_db_users', defaultUsers);
  }

  private setUsers(users: StorageUser[]): void {
    setStorageItem('chirkut_db_users', users);
  }

  private getTweets(): Tweet[] {
    return getStorageItem<Tweet[]>('chirkut_db_tweets', defaultTweets);
  }

  private setTweets(tweets: Tweet[]): void {
    // Strip heavy base64 avatars and display names before saving to localStorage to maintain minimal size
    const stripped = tweets.map(t => ({
      ...t,
      avatar: '',
      displayName: '',
      originalTweetAvatar: '',
      originalTweetDisplayName: '',
      comments: t.comments ? t.comments.map(c => ({
        ...c,
        avatar: '',
        displayName: ''
      })) : []
    }));
    setStorageItem('chirkut_db_tweets', stripped);
  }

  private getFriendships(): StorageFriendship[] {
    return getStorageItem<StorageFriendship[]>('chirkut_db_friendships', defaultFriendships);
  }

  private setFriendships(friendships: StorageFriendship[]): void {
    setStorageItem('chirkut_db_friendships', friendships);
  }

  private getChirkuts(): Chirkut[] {
    return getStorageItem<Chirkut[]>('chirkut_db_chirkuts', defaultChirkuts);
  }

  private setChirkuts(chirkuts: Chirkut[]): void {
    // Strip heavy base64 sender/receiver info before saving to localStorage
    const stripped = chirkuts.map(c => ({
      ...c,
      senderAvatar: '',
      senderDisplayName: '',
      receiverDisplayName: ''
    }));
    setStorageItem('chirkut_db_chirkuts', stripped);
  }

  private getNotificationsDb(): Notification[] {
    return getStorageItem<Notification[]>('chirkut_db_notifications', defaultNotifications);
  }

  private setNotificationsDb(notifications: Notification[]): void {
    // Strip heavy base64 sender info before saving to localStorage
    const stripped = notifications.map(n => ({
      ...n,
      senderAvatar: '',
      senderDisplayName: ''
    }));
    setStorageItem('chirkut_db_notifications', stripped);
  }

  // Helper: check session / guard
  private getLoggedInUsernameOrThrow(): string {
    const user = this.currentUser();
    if (!user) {
      throw new Error('অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।');
    }
    return user.username;
  }

  // ----------------------------------------------------
  // API Route Methods Implementation (Client-side Mock)
  // ----------------------------------------------------

  async verifyToken(): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.logout();
      return;
    }
    const dbUsers = this.getUsers();
    const dbUser = dbUsers.find(u => u.username === user.username);
    if (!dbUser) {
      this.logout();
      return;
    }
    const verifiedUser: User = {
      username: dbUser.username,
      displayName: dbUser.displayName,
      avatar: dbUser.avatar,
      bio: dbUser.bio,
      joinedDate: formatBanglaDate(dbUser.joinedDate),
      mobile: dbUser.mobile
    };
    this.currentUser.set(verifiedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chirkut_user', JSON.stringify(verifiedUser));
    }
    this.fetchCounts();
  }

  async register(payload: any): Promise<any> {
    const { mobile, password, username, displayName, avatarBase64, bio } = payload;

    if (!mobile || !password || !username || !displayName || !avatarBase64) {
      throw new Error('সবগুলো ঘর সঠিকভাবে পূরণ করা আবশ্যক।');
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      throw new Error('ইউজারনেমটি অবশ্যই ৩ থেকে ২০ অক্ষরের এবং শুধুমাত্র ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও আন্ডারস্কোর (_) সংবলিত হতে হবে।');
    }

    const users = this.getUsers();
    if (users.some(u => u.username === cleanUsername)) {
      throw new Error('এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি চেষ্টা করুন।');
    }

    if (users.some(u => u.mobile === mobile.trim())) {
      throw new Error('এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।');
    }

    const newUser: StorageUser = {
      username: cleanUsername,
      passwordHash: hashPassword(password),
      displayName: displayName.trim(),
      mobile: mobile.trim(),
      bio: (bio || '').trim(),
      avatar: avatarBase64,
      joinedDate: new Date().toISOString()
    };

    users.push(newUser);
    this.setUsers(users);

    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const clientUser: User = {
      username: newUser.username,
      displayName: newUser.displayName,
      avatar: newUser.avatar,
      bio: newUser.bio,
      joinedDate: formatBanglaDate(newUser.joinedDate),
      mobile: newUser.mobile
    };

    this.token.set(token);
    this.currentUser.set(clientUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chirkut_token', token);
      localStorage.setItem('chirkut_user', JSON.stringify(clientUser));
    }

    // Auto trigger initial load counts
    this.fetchCounts();

    return {
      message: 'নিবন্ধন সফল হয়েছে!',
      token,
      user: clientUser
    };
  }

  async login(payload: any): Promise<any> {
    const { mobile, password } = payload;

    if (!mobile || !password) {
      throw new Error('মোবাইল নম্বর এবং পাসওয়ার্ড পূরণ করা আবশ্যক।');
    }

    const users = this.getUsers();
    const inputVal = mobile.trim().toLowerCase();
    const user = users.find(u => 
      u.mobile === mobile.trim() || 
      u.username === inputVal || 
      '@' + u.username === inputVal
    );

    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new Error('মোবাইল নম্বর অথবা পাসওয়ার্ডটি সঠিক নয়।');
    }

    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const clientUser: User = {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      joinedDate: formatBanglaDate(user.joinedDate),
      mobile: user.mobile
    };

    this.token.set(token);
    this.currentUser.set(clientUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chirkut_token', token);
      localStorage.setItem('chirkut_user', JSON.stringify(clientUser));
    }

    this.fetchCounts();

    return {
      message: 'লগইন সফল হয়েছে!',
      token,
      user: clientUser
    };
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chirkut_token');
      localStorage.removeItem('chirkut_user');
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    this.getLoggedInUsernameOrThrow();
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const users = this.getUsers();
    return users
      .filter(u => u.username.includes(cleanQuery) || u.displayName.toLowerCase().includes(cleanQuery))
      .map(u => ({
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        joinedDate: formatBanglaDate(u.joinedDate)
      }));
  }

  async getProfile(username: string): Promise<{ profile: User; stats: any; friendship: any }> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();
    const targetUsername = username.trim().toLowerCase();

    const users = this.getUsers();
    const targetUser = users.find(u => u.username === targetUsername);

    if (!targetUser) {
      throw new Error('ব্যবহারকারীকে পাওয়া যায়নি।');
    }

    const tweets = this.getTweets();
    const chirkuts = this.getChirkuts();
    const friendships = this.getFriendships();

    const totalTweets = tweets.filter(t => t.username === targetUsername).length;
    const totalChirkutsSent = chirkuts.filter(c => c.senderUsername === targetUsername).length;
    const totalChirkutsReceived = chirkuts.filter(c => c.receiverUsername === targetUsername).length;
    const totalFriends = friendships.filter(f => f.status === 'accepted' && (f.sender === targetUsername || f.receiver === targetUsername)).length;

    let friendshipStatus = 'none'; // 'none', 'pending_sent', 'pending_received', 'friends'
    let requestId = '';

    const friendship = friendships.find(f => 
      (f.sender === loggedInUser && f.receiver === targetUsername) ||
      (f.sender === targetUsername && f.receiver === loggedInUser)
    );

    if (friendship) {
      requestId = friendship.id;
      if (friendship.status === 'accepted') {
        friendshipStatus = 'friends';
      } else if (friendship.sender === loggedInUser) {
        friendshipStatus = 'pending_sent';
      } else {
        friendshipStatus = 'pending_received';
      }
    }

    return {
      profile: {
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        joinedDate: formatBanglaDate(targetUser.joinedDate)
      },
      stats: {
        totalFriends: toBanglaDigits(totalFriends),
        totalTweets: toBanglaDigits(totalTweets),
        totalChirkutsSent: toBanglaDigits(totalChirkutsSent),
        totalChirkutsReceived: toBanglaDigits(totalChirkutsReceived)
      },
      friendship: {
        status: friendshipStatus,
        requestId
      }
    };
  }

  async sendFriendRequest(targetUsername: string): Promise<any> {
    const sender = this.getLoggedInUsernameOrThrow();
    const targetClean = targetUsername.trim().toLowerCase();

    if (sender === targetClean) {
      throw new Error('আপনি নিজেকে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবেন না!');
    }

    const users = this.getUsers();
    const targetUser = users.find(u => u.username === targetClean);
    if (!targetUser) {
      throw new Error('ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।');
    }

    const friendships = this.getFriendships();
    const existing = friendships.find(f => 
      (f.sender === sender && f.receiver === targetClean) ||
      (f.sender === targetClean && f.receiver === sender)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('আপনারা ইতিমধ্যে বন্ধু!');
      } else {
        throw new Error('ইতিমধ্যে একটি ফ্রেন্ড রিকোয়েস্ট পেন্ডিং রয়েছে।');
      }
    }

    const requestId = 'f_' + Math.random().toString(36).substring(2);
    const newRequest: StorageFriendship = {
      id: requestId,
      sender,
      receiver: targetClean,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    friendships.push(newRequest);
    this.setFriendships(friendships);

    // Add Notification
    const notifications = this.getNotificationsDb();
    const currentProfile = this.currentUser()!;
    notifications.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2),
      username: targetClean,
      type: 'friend_request',
      sender,
      senderDisplayName: currentProfile.displayName,
      senderAvatar: currentProfile.avatar,
      timestamp: new Date().toISOString(),
      timestampFormatted: 'এইমাত্র',
      details: `${currentProfile.displayName} আপনাকে একটি বন্ধুত্বের অনুরোধ পাঠিয়েছেন।`,
      isRead: false
    });
    this.setNotificationsDb(notifications);

    return { message: 'বন্ধুত্বের অনুরোধ পাঠানো হয়েছে!', requestId };
  }

  async respondFriendRequest(requestId: string, action: 'accept' | 'reject'): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const friendships = this.getFriendships();
    const fIdx = friendships.findIndex(f => f.id === requestId);

    if (fIdx === -1) {
      throw new Error('বন্ধুত্বের অনুরোধটি খুঁজে পাওয়া যায়নি।');
    }

    const request = friendships[fIdx];
    if (request.receiver !== loggedInUser) {
      throw new Error('আপনি শুধুমাত্র আপনাকে পাঠানো অনুরোধেই সাড়া দিতে পারেন।');
    }

    if (action === 'reject') {
      friendships.splice(fIdx, 1);
      this.setFriendships(friendships);
      return { message: 'বন্ধুত্বের অনুরোধ প্রত্যাখ্যান করা হয়েছে।' };
    } else {
      request.status = 'accepted';
      this.setFriendships(friendships);

      // Create Notification for target (the original sender)
      const currentProfile = this.currentUser()!;
      const notifications = this.getNotificationsDb();
      notifications.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2),
        username: request.sender,
        type: 'friend_accepted',
        sender: loggedInUser,
        senderDisplayName: currentProfile.displayName,
        senderAvatar: currentProfile.avatar,
        timestamp: new Date().toISOString(),
        timestampFormatted: 'এইমাত্র',
        details: `${currentProfile.displayName} আপনার বন্ধুত্বের অনুরোধ গ্রহণ করেছেন! আপনারা এখন বন্ধু।`,
        isRead: false
      });
      this.setNotificationsDb(notifications);

      return { message: 'আপনারা এখন বন্ধু!' };
    }
  }

  async getFriendsList(): Promise<{ friends: Friend[]; requests: FriendRequest[] }> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const friendships = this.getFriendships();
    const users = this.getUsers();

    const friends: Friend[] = [];
    const requests: FriendRequest[] = [];

    friendships.forEach(f => {
      if (f.status === 'accepted') {
        if (f.sender === loggedInUser) {
          const u = users.find(user => user.username === f.receiver);
          if (u) {
            friends.push({
              username: u.username,
              displayName: u.displayName,
              avatar: u.avatar,
              bio: u.bio
            });
          }
        } else if (f.receiver === loggedInUser) {
          const u = users.find(user => user.username === f.sender);
          if (u) {
            friends.push({
              username: u.username,
              displayName: u.displayName,
              avatar: u.avatar,
              bio: u.bio
            });
          }
        }
      } else if (f.status === 'pending' && f.receiver === loggedInUser) {
        const u = users.find(user => user.username === f.sender);
        if (u) {
          requests.push({
            requestId: f.id,
            username: u.username,
            displayName: u.displayName,
            avatar: u.avatar,
            createdAt: formatBanglaDate(f.createdAt)
          });
        }
      }
    });

    return { friends, requests };
  }

  async sendChirkut(receiverUsername: string, content: string): Promise<any> {
    const sender = this.getLoggedInUsernameOrThrow();
    const receiverClean = receiverUsername.trim().toLowerCase();

    if (!content || !content.trim()) {
      throw new Error('চিঠির মূল বক্তব্য বা চিরকুটের লেখা খালি হতে পারে না।');
    }

    const users = this.getUsers();
    const receiverUser = users.find(u => u.username === receiverClean);
    if (!receiverUser) {
      throw new Error('প্রাপককে খুঁজে পাওয়া যায়নি।');
    }

    // Must be friends to send Chirkuts
    const friendships = this.getFriendships();
    const isFriend = friendships.some(f => 
      f.status === 'accepted' && 
      ((f.sender === sender && f.receiver === receiverClean) || (f.sender === receiverClean && f.receiver === sender))
    );

    if (!isFriend && receiverClean !== 'chirkut_official') {
      throw new Error('আপনি শুধুমাত্র বন্ধুদেরই চিরকুট পাঠাতে পারবেন।');
    }

    const chirkuts = this.getChirkuts();
    const currentProfile = this.currentUser()!;

    const newChirkut: Chirkut = {
      id: 'chk_' + Math.random().toString(36).substring(2),
      senderUsername: sender,
      senderDisplayName: currentProfile.displayName,
      senderAvatar: currentProfile.avatar,
      receiverUsername: receiverClean,
      receiverDisplayName: receiverUser.displayName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      createdAtFormatted: 'এইমাত্র',
      isRead: false,
      isDelivered: true
    };

    chirkuts.unshift(newChirkut);
    this.setChirkuts(chirkuts);

    // Notification
    const notifications = this.getNotificationsDb();
    notifications.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2),
      username: receiverClean,
      type: 'new_chirkut',
      sender,
      senderDisplayName: currentProfile.displayName,
      senderAvatar: currentProfile.avatar,
      timestamp: new Date().toISOString(),
      timestampFormatted: 'এইমাত্র',
      details: `${currentProfile.displayName} আপনাকে একটি গোপন ডিজিটাল চিরকুট পাঠিয়েছেন।`,
      isRead: false
    });
    this.setNotificationsDb(notifications);

    return { message: 'চিরকুটটি সফলভাবে পাঠানো হয়েছে!' };
  }

  async getReceivedChirkuts(): Promise<Chirkut[]> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const chirkuts = this.getChirkuts();
    const users = this.getUsers();
    const received = chirkuts
      .filter(c => c.receiverUsername === loggedInUser)
      .map(c => {
        const sender = users.find(u => u.username === c.senderUsername);
        const receiver = users.find(u => u.username === c.receiverUsername);
        return {
          ...c,
          senderDisplayName: sender ? sender.displayName : c.senderDisplayName,
          senderAvatar: sender ? sender.avatar : c.senderAvatar,
          receiverDisplayName: receiver ? receiver.displayName : c.receiverDisplayName,
          createdAtFormatted: formatBanglaDate(c.createdAt)
        };
      });

    const unread = received.filter(c => !c.isRead).length;
    this.unreadChirkutsCount.set(unread);

    return received;
  }

  async getSentChirkuts(): Promise<Chirkut[]> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const chirkuts = this.getChirkuts();
    const users = this.getUsers();
    return chirkuts
      .filter(c => c.senderUsername === loggedInUser)
      .map(c => {
        const sender = users.find(u => u.username === c.senderUsername);
        const receiver = users.find(u => u.username === c.receiverUsername);
        return {
          ...c,
          senderDisplayName: sender ? sender.displayName : c.senderDisplayName,
          senderAvatar: sender ? sender.avatar : c.senderAvatar,
          receiverDisplayName: receiver ? receiver.displayName : c.receiverDisplayName,
          createdAtFormatted: formatBanglaDate(c.createdAt)
        };
      });
  }

  async markChirkutAsRead(chirkutId: string): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const chirkuts = this.getChirkuts();
    const chirkut = chirkuts.find(c => c.id === chirkutId);

    if (chirkut && chirkut.receiverUsername === loggedInUser) {
      chirkut.isRead = true;
      this.setChirkuts(chirkuts);
    }

    this.getReceivedChirkuts().catch(() => {}); // refresh counts
    return { message: 'চিরকুট পঠিত হিসেবে চিহ্নিত হয়েছে।' };
  }

  async createTweet(content: string, originalTweetId?: string | null): Promise<any> {
    const author = this.getLoggedInUsernameOrThrow();

    if (!content || !content.trim()) {
      throw new Error('টুইটের বক্তব্য খালি হতে পারে না।');
    }

    const currentProfile = this.currentUser()!;
    const tweets = this.getTweets();

    let extra: any = {};
    if (originalTweetId) {
      const orig = tweets.find(t => t.id === originalTweetId);
      if (orig) {
        orig.repostCount += 1;
        orig.repostCountFormatted = toBanglaDigits(orig.repostCount);
        if (!orig.repostedBy) {
          orig.repostedBy = [];
        }
        if (!orig.repostedBy.includes(author)) {
          orig.repostedBy.push(author);
        }
        
        extra = {
          originalTweetId: orig.id,
          originalTweetAuthor: orig.username,
          originalTweetDisplayName: orig.displayName,
          originalTweetAvatar: orig.avatar,
          originalTweetContent: orig.content
        };

        // Notify original author
        if (orig.username !== author) {
          const notifications = this.getNotificationsDb();
          notifications.unshift({
            id: 'notif_' + Math.random().toString(36).substring(2),
            username: orig.username,
            type: 'tweet_repost',
            sender: author,
            senderDisplayName: currentProfile.displayName,
            senderAvatar: currentProfile.avatar,
            timestamp: new Date().toISOString(),
            timestampFormatted: 'এইমাত্র',
            details: `${currentProfile.displayName} আপনার টুইটটি রি-পোস্ট করেছেন।`,
            isRead: false,
            tweetId: orig.id
          });
          this.setNotificationsDb(notifications);
        }
      }
    }

    const newTweet: Tweet = {
      id: 'tweet_' + Math.random().toString(36).substring(2),
      username: author,
      displayName: currentProfile.displayName,
      avatar: currentProfile.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      createdAtFormatted: 'এইমাত্র',
      loves: [],
      lovesCountFormatted: '০',
      comments: [],
      commentsCountFormatted: '০',
      repostCount: 0,
      repostCountFormatted: '০',
      repostedBy: [],
      originalTweetId: originalTweetId || null,
      ...extra
    };

    tweets.unshift(newTweet);
    this.setTweets(tweets);

    return { message: 'টুইট সফলভাবে প্রকাশ করা হয়েছে!', tweet: newTweet };
  }

  async getTweetsList(): Promise<Tweet[]> {
    this.getLoggedInUsernameOrThrow();
    const tweets = this.getTweets();
    const users = this.getUsers();

    return tweets.map(t => {
      const authorUser = users.find(u => u.username === t.username);
      const origUser = t.originalTweetId ? users.find(u => u.username === t.originalTweetAuthor) : null;
      return {
        ...t,
        displayName: authorUser ? authorUser.displayName : t.displayName,
        avatar: authorUser ? authorUser.avatar : t.avatar,
        originalTweetDisplayName: origUser ? origUser.displayName : t.originalTweetDisplayName,
        originalTweetAvatar: origUser ? origUser.avatar : t.originalTweetAvatar,
        createdAtFormatted: formatBanglaDate(t.createdAt),
        lovesCountFormatted: toBanglaDigits(t.loves.length),
        commentsCountFormatted: toBanglaDigits(t.comments.length),
        repostCountFormatted: toBanglaDigits(t.repostCount),
        repostedBy: t.repostedBy || [],
        comments: t.comments ? t.comments.map(c => {
          const commenter = users.find(u => u.username === c.username);
          return {
            ...c,
            displayName: commenter ? commenter.displayName : c.displayName,
            avatar: commenter ? commenter.avatar : c.avatar,
            createdAtFormatted: formatBanglaDate(c.createdAt),
            likesCountFormatted: toBanglaDigits(c.likes.length)
          };
        }) : []
      };
    });
  }

  async loveTweet(tweetId: string): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const tweets = this.getTweets();
    const tweet = tweets.find(t => t.id === tweetId);

    if (!tweet) {
      throw new Error('টুইটটি খুঁজে পাওয়া যায়নি।');
    }

    const uIdx = tweet.loves.indexOf(loggedInUser);
    const currentProfile = this.currentUser()!;
    let loved = false;

    if (uIdx === -1) {
      tweet.loves.push(loggedInUser);
      loved = true;
      this.setTweets(tweets);

      // Notify tweet author
      if (tweet.username !== loggedInUser) {
        const notifications = this.getNotificationsDb();
        notifications.unshift({
          id: 'notif_' + Math.random().toString(36).substring(2),
          username: tweet.username,
          type: 'tweet_love',
          sender: loggedInUser,
          senderDisplayName: currentProfile.displayName,
          senderAvatar: currentProfile.avatar,
          timestamp: new Date().toISOString(),
          timestampFormatted: 'এইমাত্র',
          details: `${currentProfile.displayName} আপনার টুইটটিতে ভালোবাসা জানিয়েছেন। ❤️`,
          isRead: false,
          tweetId: tweet.id
        });
        this.setNotificationsDb(notifications);
      }
    } else {
      tweet.loves.splice(uIdx, 1);
      this.setTweets(tweets);
    }

    return { message: loved ? 'টুইটে লাইক দেওয়া হয়েছে।' : 'টুইট থেকে লাইক প্রত্যাহার করা হয়েছে।' };
  }

  async commentTweet(tweetId: string, content: string): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    if (!content || !content.trim()) {
      throw new Error('মন্তব্য খালি হতে পারে না।');
    }

    const tweets = this.getTweets();
    const tweet = tweets.find(t => t.id === tweetId);

    if (!tweet) {
      throw new Error('টুইটটি খুঁজে পাওয়া যায়নি।');
    }

    const currentProfile = this.currentUser()!;
    const newComment: Comment = {
      id: 'c_' + Math.random().toString(36).substring(2),
      username: loggedInUser,
      displayName: currentProfile.displayName,
      avatar: currentProfile.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      createdAtFormatted: 'এইমাত্র',
      likes: [],
      likesCountFormatted: '০'
    };

    tweet.comments.push(newComment);
    this.setTweets(tweets);

    // Notify tweet author
    if (tweet.username !== loggedInUser) {
      const notifications = this.getNotificationsDb();
      notifications.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2),
        username: tweet.username,
        type: 'tweet_comment',
        sender: loggedInUser,
        senderDisplayName: currentProfile.displayName,
        senderAvatar: currentProfile.avatar,
        timestamp: new Date().toISOString(),
        timestampFormatted: 'এইমাত্র',
        details: `${currentProfile.displayName} আপনার টুইটে মন্তব্য করেছেন: "${content.trim()}"`,
        isRead: false,
        tweetId: tweet.id
      });
      this.setNotificationsDb(notifications);
    }

    return { message: 'মন্তব্য সফলভাবে যোগ করা হয়েছে!' };
  }

  async getNotifications(): Promise<Notification[]> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const notifications = this.getNotificationsDb();
    const users = this.getUsers();
    const userNotifs = notifications
      .filter(n => n.username === loggedInUser)
      .map(n => {
        const sender = users.find(u => u.username === n.sender);
        return {
          ...n,
          senderDisplayName: sender ? sender.displayName : n.senderDisplayName,
          senderAvatar: sender ? sender.avatar : n.senderAvatar,
          timestampFormatted: formatBanglaDate(n.timestamp)
        };
      });

    const unread = userNotifs.filter(n => !n.isRead).length;
    this.unreadNotificationsCount.set(unread);

    return userNotifs;
  }

  async markNotificationsAsRead(): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    const notifications = this.getNotificationsDb();
    notifications.forEach(n => {
      if (n.username === loggedInUser) {
        n.isRead = true;
      }
    });

    this.setNotificationsDb(notifications);
    this.unreadNotificationsCount.set(0);

    return { message: 'সব নোটিফিকেশন পঠিত হিসেবে চিহ্নিত হয়েছে।' };
  }

  async updateSettings(payload: any): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();
    const { displayName, bio, avatarBase64 } = payload;

    if (!displayName || !displayName.trim()) {
      throw new Error('প্রদর্শন নাম (Display Name) খালি হতে পারে না।');
    }

    const users = this.getUsers();
    const uIdx = users.findIndex(u => u.username === loggedInUser);

    if (uIdx === -1) {
      throw new Error('ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।');
    }

    users[uIdx].displayName = displayName.trim();
    users[uIdx].bio = (bio || '').trim();
    if (avatarBase64) {
      users[uIdx].avatar = avatarBase64;
    }

    this.setUsers(users);

    const updatedUser: User = {
      username: users[uIdx].username,
      displayName: users[uIdx].displayName,
      avatar: users[uIdx].avatar,
      bio: users[uIdx].bio,
      joinedDate: formatBanglaDate(users[uIdx].joinedDate),
      mobile: users[uIdx].mobile
    };

    this.currentUser.set(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chirkut_user', JSON.stringify(updatedUser));
    }

    // Cascade update display name and avatar in all tweets, comments, chirkuts, and notifications!
    const tweets = this.getTweets();
    tweets.forEach(t => {
      if (t.username === loggedInUser) {
        t.displayName = updatedUser.displayName;
        t.avatar = updatedUser.avatar;
      }
      if (t.originalTweetAuthor === loggedInUser) {
        t.originalTweetDisplayName = updatedUser.displayName;
        t.originalTweetAvatar = updatedUser.avatar;
      }
      t.comments.forEach(c => {
        if (c.username === loggedInUser) {
          c.displayName = updatedUser.displayName;
          c.avatar = updatedUser.avatar;
        }
      });
    });
    this.setTweets(tweets);

    const chirkuts = this.getChirkuts();
    chirkuts.forEach(c => {
      if (c.senderUsername === loggedInUser) {
        c.senderDisplayName = updatedUser.displayName;
        c.senderAvatar = updatedUser.avatar;
      }
      if (c.receiverUsername === loggedInUser) {
        c.receiverDisplayName = updatedUser.displayName;
      }
    });
    this.setChirkuts(chirkuts);

    const notifications = this.getNotificationsDb();
    notifications.forEach(n => {
      if (n.sender === loggedInUser) {
        n.senderDisplayName = updatedUser.displayName;
        n.senderAvatar = updatedUser.avatar;
      }
    });
    this.setNotificationsDb(notifications);

    return {
      message: 'প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে!',
      user: updatedUser
    };
  }

  async deleteAccount(): Promise<any> {
    const loggedInUser = this.getLoggedInUsernameOrThrow();

    // 1. Delete user from list
    const users = this.getUsers();
    const updatedUsers = users.filter(u => u.username !== loggedInUser);
    this.setUsers(updatedUsers);

    // 2. Delete user's tweets and cascade comments
    const tweets = this.getTweets();
    const remainingTweets = tweets.filter(t => t.username !== loggedInUser);
    remainingTweets.forEach(t => {
      t.loves = t.loves.filter(u => u !== loggedInUser);
      t.comments = t.comments.filter(c => c.username !== loggedInUser);
    });
    this.setTweets(remainingTweets);

    // 3. Delete user's chirkuts
    const chirkuts = this.getChirkuts();
    const remainingChirkuts = chirkuts.filter(c => c.senderUsername !== loggedInUser && c.receiverUsername !== loggedInUser);
    this.setChirkuts(remainingChirkuts);

    // 4. Delete user's friendships
    const friendships = this.getFriendships();
    const remainingFriendships = friendships.filter(f => f.sender !== loggedInUser && f.receiver !== loggedInUser);
    this.setFriendships(remainingFriendships);

    // 5. Delete user's notifications
    const notifications = this.getNotificationsDb();
    const remainingNotifications = notifications.filter(n => n.username !== loggedInUser && n.sender !== loggedInUser);
    this.setNotificationsDb(remainingNotifications);

    this.logout();

    return { message: 'আপনার অ্যাকাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  private fetchCounts(): void {
    this.getReceivedChirkuts().catch(() => {});
    this.getNotifications().catch(() => {});
  }
}
