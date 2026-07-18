/* eslint-disable */
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, User, Tweet, Chirkut, Friend, FriendRequest, Notification } from './api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  api = inject(ApiService);
  private fb = inject(FormBuilder);

  // Forms
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  tweetForm!: FormGroup;
  chirkutForm!: FormGroup;
  commentForm!: FormGroup;
  settingsForm!: FormGroup;

  // Navigation & UI state
  activeView = signal<'home' | 'dashboard' | 'friends' | 'profile' | 'settings'>('home');
  activeDashboardTab = signal<'received' | 'sent' | 'requests' | 'notifications'>('received');
  
  // Data lists
  tweets = signal<Tweet[]>([]);
  receivedChirkuts = signal<Chirkut[]>([]);
  sentChirkuts = signal<Chirkut[]>([]);
  friendsList = signal<Friend[]>([]);
  pendingRequests = signal<FriendRequest[]>([]);
  notificationsList = signal<Notification[]>([]);
  
  // Search & Profile overlay states
  searchQuery = signal<string>('');
  searchResults = signal<User[]>([]);
  selectedUsername = signal<string | null>(null);
  selectedProfileData = signal<{ profile: User; stats: any; friendship: any } | null>(null);
  selectedProfileLoading = signal<boolean>(false);

  // Interaction auxiliary states
  currentChirkutIndex = signal<number>(0);
  commentingTweetId = signal<string | null>(null);
  showToast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  isSubmitting = signal<boolean>(false);
  notificationDropdownOpen = signal<boolean>(false);
  showSplashScreen = signal<boolean>(true);
  repostTarget = signal<Tweet | null>(null);
  
  // Base64 Images preview cache
  registerAvatarBase64 = signal<string | null>(null);
  settingsAvatarBase64 = signal<string | null>(null);

  // Polling interval reference
  private pollInterval: any;
  private toastTimeout: any;

  // Active user profile shortcut
  currentUser = computed(() => this.api.currentUser());
  isLoggedIn = computed(() => this.api.isLoggedIn());

  userTweetsCount = computed(() => {
    const current = this.currentUser();
    if (!current) return 0;
    return this.tweets().filter(t => t.username === current.username).length;
  });

  toBanglaDigits(n: number | string): string {
    const digits: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    const str = String(n);
    return str.split('').map(char => digits[char] || char).join('');
  }

  getFilteredTweets(username: string): Tweet[] {
    return this.tweets().filter(t => t.username === username);
  }

  ngOnInit(): void {
    this.initForms();
    
    // Check if we are already logged in on startup
    if (this.isLoggedIn()) {
      this.loadAllData();
    }

    // Set up a background pooling cycle to fetch notifications and check for new chirkuts every 10 seconds
    if (typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        if (this.isLoggedIn()) {
          this.refreshNotificationsAndCounts();
        }
      }, 10000);

      setTimeout(() => {
        this.showSplashScreen.set(false);
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      mobile: ['', [Validators.required, Validators.pattern(/^01[3-9]\d{8}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      mobile: ['', [Validators.required, Validators.pattern(/^01[3-9]\d{8}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      username: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]{3,20}$/)]],
      displayName: ['', [Validators.required, Validators.maxLength(50)]],
      bio: ['', [Validators.maxLength(160)]]
    });

    this.tweetForm = this.fb.group({
      content: ['', [Validators.required]]
    });

    this.chirkutForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(500)]]
    });

    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(200)]]
    });

    // Populate settings form lazily when view opens
    this.settingsForm = this.fb.group({
      displayName: ['', [Validators.maxLength(50)]],
      bio: ['', [Validators.maxLength(160)]],
      newPassword: ['', [Validators.minLength(6)]]
    });
  }

  // ----------------------------------------------------
  // Load & Sync Methods
  // ----------------------------------------------------
  async loadAllData() {
    this.isSubmitting.set(true);
    try {
      await Promise.all([
        this.fetchTweets(),
        this.fetchReceivedChirkuts(),
        this.fetchSentChirkuts(),
        this.fetchFriendsList(),
        this.fetchNotifications()
      ]);
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async fetchTweets() {
    const data = await this.api.getTweetsList();
    this.tweets.set(data);
  }

  async fetchReceivedChirkuts() {
    const data = await this.api.getReceivedChirkuts();
    this.receivedChirkuts.set(data);
    // Auto-mark first chirkut as read when received list loads
    if (data.length > 0 && this.activeView() === 'home' && !data[0].isRead) {
      this.markChirkutAsRead(data[0].id);
    }
  }

  async fetchSentChirkuts() {
    const data = await this.api.getSentChirkuts();
    this.sentChirkuts.set(data);
  }

  async fetchFriendsList() {
    const data = await this.api.getFriendsList();
    this.friendsList.set(data.friends);
    this.pendingRequests.set(data.requests);
  }

  async fetchNotifications() {
    const data = await this.api.getNotifications();
    this.notificationsList.set(data);
  }

  async refreshNotificationsAndCounts() {
    try {
      const data = await this.api.getNotifications();
      this.notificationsList.set(data);
      
      const chirkuts = await this.api.getReceivedChirkuts();
      this.receivedChirkuts.set(chirkuts);
    } catch {
      // fail silently on background poll
    }
  }

  // ----------------------------------------------------
  // Authentication Actions
  // ----------------------------------------------------
  async onLogin() {
    if (this.loginForm.invalid) {
      this.triggerToast('দয়া করে সঠিক মোবাইল নম্বর এবং পাসওয়ার্ড প্রদান করুন।', 'error');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const res = await this.api.login(this.loginForm.value);
      this.triggerToast(res.message, 'success');
      this.loginForm.reset();
      this.loadAllData();
      this.activeView.set('home');
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onRegister() {
    if (this.registerForm.invalid) {
      this.triggerToast('দয়া করে নিবন্ধন ফরমের সবগুলো ঘর সঠিকভাবে পূরণ করুন।', 'error');
      return;
    }

    if (!this.registerAvatarBase64()) {
      this.triggerToast('নিবন্ধনের জন্য প্রোফাইল ছবি আপলোড করা বাধ্যতামূলক।', 'error');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = {
        ...this.registerForm.value,
        avatarBase64: this.registerAvatarBase64()
      };
      const res = await this.api.register(payload);
      this.triggerToast(res.message, 'success');
      this.registerForm.reset();
      this.registerAvatarBase64.set(null);
      this.loadAllData();
      this.activeView.set('home');
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onLogout() {
    this.api.logout();
    this.activeView.set('home');
    this.triggerToast('আপনি সফলভাবে লগআউট করেছেন।', 'success');
  }

  // File Handlers converting to Base64 with high-efficiency canvas compression
  private compressAndSetAvatar(file: File, isSettings: boolean): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          if (isSettings) {
            this.settingsAvatarBase64.set(compressed);
          } else {
            this.registerAvatarBase64.set(compressed);
          }
        } else {
          if (isSettings) {
            this.settingsAvatarBase64.set(e.target.result as string);
          } else {
            this.registerAvatarBase64.set(e.target.result as string);
          }
        }
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  onRegisterAvatarSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.triggerToast('প্রোফাইল ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে।', 'error');
        return;
      }
      this.compressAndSetAvatar(file, false);
    }
  }

  onSettingsAvatarSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.triggerToast('প্রোফাইল ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে।', 'error');
        return;
      }
      this.compressAndSetAvatar(file, true);
    }
  }

  // ----------------------------------------------------
  // Tweet Actions
  // ----------------------------------------------------
  // Count words to ensure maximum 50 words constraint
  getTweetWordCount(): number {
    const text = this.tweetForm.get('content')?.value || '';
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  async onPublishTweet() {
    if (this.tweetForm.invalid) {
      this.triggerToast('টুইটের বিষয়বস্তু ফাঁকা হতে পারে না।', 'error');
      return;
    }

    if (this.getTweetWordCount() > 50) {
      this.triggerToast('টুইটটি অবশ্যই ৫০ শব্দের মধ্যে সীমাবদ্ধ হতে হবে।', 'error');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const res = await this.api.createTweet(this.tweetForm.value.content);
      this.triggerToast(res.message, 'success');
      this.tweetForm.reset();
      await this.fetchTweets();
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async toggleLove(tweet: Tweet) {
    try {
      const res = await this.api.loveTweet(tweet.id);
      this.tweets.update(list => list.map(t => {
        if (t.id === tweet.id) {
          const username = this.currentUser()!.username;
          const loved = t.loves.includes(username);
          return {
            ...t,
            loves: loved ? t.loves.filter(u => u !== username) : [...t.loves, username],
            lovesCountFormatted: res.lovesCount
          };
        }
        return t;
      }));
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    }
  }

  onToggleCommentBox(tweetId: string) {
    if (this.commentingTweetId() === tweetId) {
      this.commentingTweetId.set(null);
    } else {
      this.commentingTweetId.set(tweetId);
      this.commentForm.reset();
    }
  }

  async onSubmitComment(tweetId: string) {
    if (this.commentForm.invalid) return;
    
    this.isSubmitting.set(true);
    try {
      const res = await this.api.commentTweet(tweetId, this.commentForm.value.content);
      this.triggerToast(res.message, 'success');
      this.commentForm.reset();
      this.commentingTweetId.set(null);
      await this.fetchTweets();
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onRepost(tweet: Tweet) {
    if (this.hasReposted(tweet.id)) {
      this.triggerToast('আপনি ইতিমধ্যে এই টুইটটি রি-পোস্ট করেছেন!', 'info');
      return;
    }
    this.repostTarget.set(tweet);
  }

  async executeRepost() {
    const tweet = this.repostTarget();
    if (!tweet) return;

    this.repostTarget.set(null);
    this.isSubmitting.set(true);
    try {
      const res = await this.api.createTweet(tweet.content, tweet.id);
      this.triggerToast('সফলভাবে রি-পোস্ট করা হয়েছে!', 'success');
      await this.fetchTweets();
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  hasReposted(tweetId: string): boolean {
    const current = this.currentUser();
    if (!current) return false;
    const tweetObj = this.tweets().find(t => t.id === tweetId);
    if (tweetObj && tweetObj.repostedBy && tweetObj.repostedBy.includes(current.username)) {
      return true;
    }
    return this.tweets().some(t => t.username === current.username && t.originalTweetId === tweetId);
  }

  scrollToTweet(tweetId: string) {
    this.activeView.set('home');
    setTimeout(() => {
      const el = document.getElementById(`tweet-card-${tweetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-green-500/30', 'bg-green-50/50');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-green-500/30', 'bg-green-50/50');
        }, 2000);
      } else {
        this.triggerToast('অরিজিনাল টুইটটি খুঁজে পাওয়া যায়নি।', 'info');
      }
    }, 150);
  }

  onShareTweet(tweet: Tweet) {
    const shareText = `"${tweet.content}" - চিরকুটে @${tweet.username} এর পোস্ট।`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        this.triggerToast('টুইটের টেক্সট ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
      }).catch(() => {
        this.triggerToast('লিঙ্ক কপি করতে সমস্যা হয়েছে।', 'error');
      });
    } else {
      alert(shareText);
    }
  }

  // ----------------------------------------------------
  // Chirkut Actions
  // ----------------------------------------------------
  async markChirkutAsRead(chirkutId: string) {
    try {
      await this.api.markChirkutAsRead(chirkutId);
      this.receivedChirkuts.update(list => list.map(c => {
        if (c.id === chirkutId) {
          return { ...c, isRead: true };
        }
        return c;
      }));
    } catch {
      // non-blocking fail
    }
  }

  onChirkutPageChanged(index: number) {
    if (index >= 0 && index < this.receivedChirkuts().length) {
      this.currentChirkutIndex.set(index);
      const activeChirkut = this.receivedChirkuts()[index];
      if (!activeChirkut.isRead) {
        this.markChirkutAsRead(activeChirkut.id);
      }
    }
  }

  async onSendChirkut(receiverUsername: string) {
    if (this.chirkutForm.invalid) {
      this.triggerToast('দয়া করে চিরকুটের বার্তাটি লিখুন।', 'error');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const res = await this.api.sendChirkut(receiverUsername, this.chirkutForm.value.content);
      this.triggerToast(res.message, 'success');
      this.chirkutForm.reset();
      await this.fetchSentChirkuts();
      // Close profile overlay and open home/dashboard
      this.closeProfileOverlay();
      this.activeView.set('dashboard');
      this.activeDashboardTab.set('sent');
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ----------------------------------------------------
  // Friends Actions
  // ----------------------------------------------------
  async onSearchUsers() {
    const q = this.searchQuery().trim();
    if (!q) {
      this.searchResults.set([]);
      return;
    }

    try {
      const res = await this.api.searchUsers(q);
      this.searchResults.set(res);
    } catch {
      // fail silently
    }
  }

  async onOpenProfile(username: string) {
    this.selectedUsername.set(username);
    this.selectedProfileLoading.set(true);
    this.activeView.set('profile');
    try {
      const data = await this.api.getProfile(username);
      this.selectedProfileData.set(data);
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.selectedProfileLoading.set(false);
    }
  }

  closeProfileOverlay() {
    this.selectedUsername.set(null);
    this.selectedProfileData.set(null);
    this.chirkutForm.reset();
    this.activeView.set('home');
  }

  async sendFriendRequest(targetUsername: string) {
    this.isSubmitting.set(true);
    try {
      const res = await this.api.sendFriendRequest(targetUsername);
      this.triggerToast(res.message, 'success');
      if (this.selectedUsername() === targetUsername) {
        // Reload current profile stats
        const data = await this.api.getProfile(targetUsername);
        this.selectedProfileData.set(data);
      }
      this.fetchFriendsList();
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async respondFriendRequest(requestId: string, action: 'accept' | 'reject') {
    this.isSubmitting.set(true);
    try {
      const res = await this.api.respondFriendRequest(requestId, action);
      this.triggerToast(res.message, 'success');
      
      // If we are currently viewing the sender's profile, refresh it
      const currentProfile = this.selectedProfileData();
      if (currentProfile) {
        const data = await this.api.getProfile(currentProfile.profile.username);
        this.selectedProfileData.set(data);
      }

      await this.fetchFriendsList();
      await this.fetchNotifications();
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ----------------------------------------------------
  // Notifications Dropdown and Action Handlers
  // ----------------------------------------------------
  toggleNotificationDropdown() {
    this.notificationDropdownOpen.set(!this.notificationDropdownOpen());
    if (this.notificationDropdownOpen()) {
      // Auto mark read
      this.api.markNotificationsAsRead().catch(() => {});
    }
  }

  onNotificationClick(notif: Notification) {
    this.notificationDropdownOpen.set(false);
    
    // Custom smart routing based on notification type
    switch (notif.type) {
      case 'friend_request':
        this.activeView.set('dashboard');
        this.activeDashboardTab.set('requests');
        break;
      case 'friend_accepted':
        this.onOpenProfile(notif.sender);
        break;
      case 'new_chirkut':
        this.activeView.set('home');
        this.currentChirkutIndex.set(0); // Show latest received
        this.fetchReceivedChirkuts();
        break;
      case 'tweet_love':
      case 'tweet_comment':
      case 'tweet_repost':
        this.activeView.set('home');
        // Flash/highlight tweet if possible, or reload list
        this.fetchTweets();
        break;
    }
  }

  // ----------------------------------------------------
  // Settings Actions
  // ----------------------------------------------------
  openSettingsView() {
    const user = this.currentUser();
    if (user) {
      this.settingsForm.patchValue({
        displayName: user.displayName,
        bio: user.bio,
        newPassword: ''
      });
      this.settingsAvatarBase64.set(null);
      this.activeView.set('settings');
    }
  }

  async onUpdateSettings() {
    this.isSubmitting.set(true);
    try {
      const payload: any = {
        displayName: this.settingsForm.value.displayName,
        bio: this.settingsForm.value.bio
      };

      if (this.settingsForm.value.newPassword) {
        payload.newPassword = this.settingsForm.value.newPassword;
      }

      if (this.settingsAvatarBase64()) {
        payload.avatarBase64 = this.settingsAvatarBase64();
      }

      const res = await this.api.updateSettings(payload);
      this.triggerToast(res.message, 'success');
      this.settingsAvatarBase64.set(null);
      this.settingsForm.patchValue({ newPassword: '' });
      this.loadAllData();
      this.activeView.set('home');
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onDeleteAccount() {
    const verify = confirm('আপনি কি নিশ্চিতভাবে আপনার অ্যাকাউন্টটি চিরতরে মুছে ফেলতে চান? আপনার সকল তথ্য, চিরকুট ও টুইট সাথে সাথে ডিলিট হয়ে যাবে এবং এটি আর ফিরে পাওয়া সম্ভব নয়।');
    if (!verify) return;

    this.isSubmitting.set(true);
    try {
      await this.api.deleteAccount();
      this.triggerToast('আপনার চিরকুট অ্যাকাউন্টটি সফলভাবে ডিলিট করা হয়েছে।', 'success');
      this.activeView.set('home');
    } catch (err: any) {
      this.triggerToast(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  triggerToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.showToast.set({ message, type });
    if (typeof window !== 'undefined') {
      this.toastTimeout = setTimeout(() => {
        this.showToast.set(null);
      }, 5000);
    }
  }

  // Safe string retrieval of current state indicators
  getActiveChirkut(): Chirkut | null {
    const list = this.receivedChirkuts();
    const idx = this.currentChirkutIndex();
    if (list.length > 0 && idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  }
}
