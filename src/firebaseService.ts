import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { Post, Inquiry, defaultPosts } from './data';

// --- Posts API ---

/**
 * Reads all property listings (posts) from Firestore and merges with Express API / Default data
 */
export async function getPostsService(): Promise<Post[]> {
  let firestorePosts: Post[] = [];
  try {
    // 1. Try Firestore first
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        firestorePosts.push(doc.data() as Post);
      });
    }
  } catch (err) {
    console.warn("Firestore posts retrieval bypassed, trying local API fallback:", err);
  }

  let expressPosts: Post[] = [];
  // 2. Fetch from Express backend /api/posts
  try {
    const res = await fetch('/api/posts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        expressPosts = data;
      }
    }
  } catch (err) {
    console.warn("Express backend posts endpoint failed", err);
  }

  // 3. Fallback to bundled static default data if both are empty
  if (firestorePosts.length === 0 && expressPosts.length === 0) {
    return defaultPosts;
  }

  // Merge lists by unique post ID so that both local and cloud updates are shown
  const mergedMap = new Map<string, Post>();
  
  // First load express posts
  expressPosts.forEach(p => {
    if (p && p.id) {
      mergedMap.set(p.id, p);
    }
  });

  // Then merge firestore posts, prioritizing newer updates / cloud truths
  firestorePosts.forEach(p => {
    if (p && p.id) {
      const existing = mergedMap.get(p.id);
      if (!existing || p.createdAt > (existing.createdAt || 0)) {
        mergedMap.set(p.id, p);
      }
    }
  });

  const mergedList = Array.from(mergedMap.values());
  // Sort by createdAt descending (newest first)
  mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return mergedList;
}

/**
 * Saves or updates a post in Firestore and tries to sync with Express backend
 */
export async function savePostService(post: Post): Promise<void> {
  const docPath = `posts/${post.id}`;
  let firestoreError: any = null;
  
  // 1. Write to Firestore
  try {
    const docRef = doc(db, 'posts', post.id);
    await setDoc(docRef, post);
    console.log("Post successfully saved to Firestore:", post.id);
  } catch (err) {
    console.warn("Post saving to Firestore bypassed (will save to local server file):", err);
    firestoreError = err;
  }

  // 2. Clear sync to Express backend /api/posts
  let expressSuccess = false;
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (res.ok) {
      expressSuccess = true;
    }
  } catch (err) {
    console.warn("Express backend post sync bypassed (offline/static mode)", err);
  }

  // 3. If Firestore fail and Express also fail, throw the Firestore Error
  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.WRITE, docPath);
  }
}

/**
 * Deletes a post from Firestore and Express backend
 */
export async function deletePostService(id: string): Promise<void> {
  const docPath = `posts/${id}`;
  let firestoreError: any = null;
  
  // 1. Delete from Firestore
  try {
    const docRef = doc(db, 'posts', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Post delete from Firestore bypassed:", err);
    firestoreError = err;
  }

  // 2. Delete on Express backend
  let expressSuccess = false;
  try {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      expressSuccess = true;
    }
  } catch (err) {
    console.warn("Express backend delete sync bypassed (offline/static mode)", err);
  }

  // 3. If Firestore fail and Express also fail, throw the Firestore Error
  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.DELETE, docPath);
  }
}


// --- Inquiries API ---

/**
 * Retrieves client counseling requests (Inquiries)
 */
export async function getInquiriesService(): Promise<Inquiry[]> {
  let firestoreInqs: Inquiry[] = [];
  
  // 1. Try Firestore first only if compiled as the authorized admin to prevent permission warnings
  const isAdmin = auth.currentUser && auth.currentUser.email === 'yunjia2miju@gmail.com';
  if (isAdmin) {
    try {
      const inquiriesRef = collection(db, 'inquiries');
      const q = query(inquiriesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      snapshot.forEach((doc) => {
        firestoreInqs.push(doc.data() as Inquiry);
      });
    } catch (err) {
      console.warn("Firestore inquiries retrieval failed, trying local API:", err);
    }
  }

  let expressInqs: Inquiry[] = [];
  // 2. Try Express backend
  try {
    const res = await fetch('/api/inquiries');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        expressInqs = data;
      }
    }
  } catch (err) {
    console.warn("Express backend inquiries endpoint failed", err);
  }

  if (firestoreInqs.length === 0 && expressInqs.length === 0) {
    return [];
  }

  const mergedMap = new Map<string, Inquiry>();
  expressInqs.forEach(inq => {
    if (inq && inq.id) {
      mergedMap.set(inq.id, inq);
    }
  });

  firestoreInqs.forEach(inq => {
    if (inq && inq.id) {
      const existing = mergedMap.get(inq.id);
      if (!existing || inq.createdAt > (existing.createdAt || 0)) {
        mergedMap.set(inq.id, inq);
      }
    }
  });

  const mergedList = Array.from(mergedMap.values());
  mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return mergedList;
}

/**
 * Submits an inquiry to Firestore, and pushes to backend
 */
export async function submitInquiryService(inq: Inquiry): Promise<void> {
  const docPath = `inquiries/${inq.id}`;
  let firestoreError: any = null;
  
  // 1. Save to Firestore
  try {
    const docRef = doc(db, 'inquiries', inq.id);
    await setDoc(docRef, inq);
    console.log("Inquiry successfully saved to Firestore:", inq.id);
  } catch (err) {
    console.warn("Inquiry save to Firestore bypassed:", err);
    firestoreError = err;
  }

  // 2. Pushes to Express backend as well
  let expressSuccess = false;
  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inq)
    });
    if (res.ok) {
      expressSuccess = true;
    }
  } catch (err) {
    console.warn("Express backend inquiry sync bypassed (offline/static mode)", err);
  }

  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.WRITE, docPath);
  }
}

/**
 * Update processed status on an inquiry
 */
export async function toggleInquiryProcessedService(id: string, currentProcessed: boolean): Promise<void> {
  const docPath = `inquiries/${id}`;
  let firestoreError: any = null;
  
  // 1. Update in Firestore
  try {
    const docRef = doc(db, 'inquiries', id);
    await updateDoc(docRef, { processed: !currentProcessed });
  } catch (err) {
    console.warn("Inquiry toggle in Firestore bypassed:", err);
    firestoreError = err;
  }

  // 2. Update on Express backend
  let expressSuccess = false;
  try {
    const res = await fetch(`/api/inquiries/${id}/toggle`, { method: 'POST' });
    if (res.ok) {
      expressSuccess = true;
    }
  } catch (err) {
    console.warn("Express backend index toggle bypassed", err);
  }

  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.UPDATE, docPath);
  }
}

// --- Registered Users Client API ---

export interface RegisteredUser {
  email: string;
  password?: string;
  name: string;
  phone: string;
  createdAt: string;
  approved: boolean;
  provider: string;
}

/**
 * Fetch all registered users
 */
export async function getRegisteredUsersService(): Promise<RegisteredUser[]> {
  let firestoreUsers: RegisteredUser[] = [];
  try {
    const q = query(collection(db, 'registered_users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        firestoreUsers.push(doc.data() as RegisteredUser);
      });
    }
  } catch (err) {
    console.warn("Firestore registered_users fetch bypassed (using local storage/API fallback) - likely offline or unmigrated:", err);
  }

  let expressUsers: RegisteredUser[] = [];
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        expressUsers = data;
      }
    }
  } catch (err) {
    console.warn("Failed fetching registered users from API", err);
  }

  // Fallback to local storage
  const localList = JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');

  const mergedMap = new Map<string, RegisteredUser>();

  // 1. Fill from local storage
  localList.forEach((u: any) => {
    if (u && u.email) {
      mergedMap.set(u.email, u);
    }
  });

  // 2. Fill/overwrite from Express API
  expressUsers.forEach(u => {
    if (u && u.email) {
      mergedMap.set(u.email, u);
    }
  });

  // 3. Fill/overwrite from Firestore client (the absolute persistent cloud truth)
  firestoreUsers.forEach(u => {
    if (u && u.email) {
      mergedMap.set(u.email, u);
    }
  });

  const mergedList = Array.from(mergedMap.values());
  // Sort descending by createdAt
  mergedList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return mergedList;
}

/**
 * Register or update a user (and cache to local storage as well for fallback consistency)
 */
export async function saveRegisteredUserService(user: RegisteredUser): Promise<void> {
  const docPath = `registered_users/${user.email}`;
  let firestoreError: any = null;

  // 1. Save to Client Firestore
  try {
    const docRef = doc(db, 'registered_users', user.email);
    await setDoc(docRef, user);
    console.log("User registered to client Firestore:", user.email);
  } catch (err) {
    console.warn("Failed saving user to client Firestore (will fall back to local/express):", err);
    firestoreError = err;
  }

  // 2. Sync locally in localStorage
  const list = JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');
  const index = list.findIndex((u: any) => u.email === user.email);
  if (index !== -1) {
    list[index] = { ...list[index], ...user };
  } else {
    list.push(user);
  }
  localStorage.setItem('taewang_registered_users', JSON.stringify(list));

  // 3. Sync with Express API
  let expressSuccess = false;
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (res.ok) {
      expressSuccess = true;
    }
  } catch (err) {
    console.warn("Failed saving registered user to API", err);
  }

  // 4. Force error classification on write failures to diagnose rule constraints
  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.WRITE, docPath);
  }
}

/**
 * Toggle approval state
 */
export async function toggleApproveUserService(email: string, currentApproved: boolean): Promise<void> {
  const docPath = `registered_users/${email}`;
  let firestoreError: any = null;

  // 1. Update in Client Firestore
  try {
    const docRef = doc(db, 'registered_users', email);
    await updateDoc(docRef, { approved: !currentApproved });
  } catch (err) {
    console.warn("Failed toggling user approval on client Firestore:", err);
    firestoreError = err;
  }

  // 2. Sync locally
  const list = JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');
  const updated = list.map((u: any) => u.email === email ? { ...u, approved: !currentApproved } : u);
  localStorage.setItem('taewang_registered_users', JSON.stringify(updated));

  // 3. Sync with API
  let expressSuccess = false;
  try {
    await fetch(`/api/users/${email}/toggle`, { method: 'POST' });
    expressSuccess = true;
  } catch (err) {
    console.warn("Failed toggling user approval on API", err);
  }

  // 4. Error check
  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.UPDATE, docPath);
  }
}

/**
 * Delete a user
 */
export async function deleteRegisteredUserService(email: string): Promise<void> {
  const docPath = `registered_users/${email}`;
  let firestoreError: any = null;

  // 1. Delete on Client Firestore
  try {
    const docRef = doc(db, 'registered_users', email);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Failed deleting user from client Firestore:", err);
    firestoreError = err;
  }

  // 2. Sync locally
  const list = JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');
  const filtered = list.filter((u: any) => u.email !== email);
  localStorage.setItem('taewang_registered_users', JSON.stringify(filtered));

  // 3. Sync with API
  let expressSuccess = false;
  try {
    await fetch(`/api/users/${email}`, { method: 'DELETE' });
    expressSuccess = true;
  } catch (err) {
    console.warn("Failed deleting user from API", err);
  }

  // 4. Error check
  if (firestoreError && !expressSuccess) {
    handleFirestoreError(firestoreError, OperationType.DELETE, docPath);
  }
}
