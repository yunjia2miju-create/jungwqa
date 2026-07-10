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
import { db, defaultDb, OperationType, handleFirestoreError, auth } from './firebase';
import { Post, Inquiry, defaultPosts } from './data';

// --- Posts API ---

/**
 * Reads all property listings (posts) from Firestore and merges with Express API / Default data
 */
export async function getPostsService(): Promise<Post[]> {
  const mergedMap = new Map<string, Post>();
  let legacyPosts: Post[] = [];

  const mergePost = (p: Post) => {
    if (!p || !p.id) return;
    const existing = mergedMap.get(p.id);
    const pTime = p.updatedAt || p.createdAt || 0;
    const existingTime = existing ? (existing.updatedAt || existing.createdAt || 0) : -1;
    if (pTime > existingTime || !existing) {
      mergedMap.set(p.id, p);
    }
  };

  // Add default static posts as initial base
  defaultPosts.forEach(mergePost);

  const fetchTasks: Promise<void>[] = [];

  // Task A: Fetch from Express backend
  fetchTasks.push((async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(mergePost);
        }
      }
    } catch (err) {
      console.warn("Express backend posts fetch failed:", err);
    }
  })());

  // Task B: Fetch from active Firestore database
  fetchTasks.push((async () => {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const p = doc.data() as Post;
        mergePost(p);
      });
    } catch (err) {
      console.warn("Active Firestore database posts fetch failed:", err);
    }
  })());

  // Task C: Legacy migration bypassed to ensure zero-risk database sync and avoid infinite Firestore write quota depletion
  /*
  if (db !== defaultDb) {
    (async () => {
      try {
        const legacyRef = collection(defaultDb, 'posts');
        const q = query(legacyRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const p = doc.data() as Post;
          if (p && p.id) {
            legacyPosts.push(p);
          }
        });
        
        if (legacyPosts.length > 0) {
          console.log(`[Migration] Found ${legacyPosts.length} legacy posts. Starting automatic migration in background...`);
          for (const post of legacyPosts) {
            try {
              const activeDocRef = doc(db, 'posts', post.id);
              await setDoc(activeDocRef, post, { merge: true });

              await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
              });
            } catch (migErr) {
              console.warn(`[Migration] Failed migrating post ${post.id}:`, migErr);
            }
          }
          console.log("[Migration] Automatic migration completed successfully.");
        }
      } catch (err) {
        console.info("Legacy Firestore database posts fetch bypassed (this is expected when using a custom named database ID):", err);
      }
    })();
  }
  */

  // Wait for Task A (API) and Task B (Active DB) to complete or settle
  await Promise.allSettled(fetchTasks);

  // Convert map to array and sort descending by createdAt
  const mergedList = Array.from(mergedMap.values());
  mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Clean nbsp characters
  const cleanNbsp = (str?: string) => str ? str.replace(/&nbsp;/gi, ' ') : '';
  const cleanedList = mergedList.map(p => ({
    ...p,
    title: cleanNbsp(p.title),
    intro: p.intro ? cleanNbsp(p.intro) : undefined,
    body: p.body ? cleanNbsp(p.body) : undefined,
    remarks: p.remarks ? cleanNbsp(p.remarks) : undefined
  }));

  return cleanedList;
}

/**
 * Saves or updates a post in Firestore and tries to sync with Express backend
 */
export async function savePostService(post: Post): Promise<void> {
  const docPath = `posts/${post.id}`;
  let firestoreError: any = null;
  
  // Clean all &nbsp; characters on save to ensure clean database storage
  const cleanNbsp = (str?: string) => str ? str.replace(/&nbsp;/gi, ' ') : '';
  const cleanedPost: Post = {
    ...post,
    title: cleanNbsp(post.title),
    intro: post.intro ? cleanNbsp(post.intro) : undefined,
    body: post.body ? cleanNbsp(post.body) : undefined,
    remarks: post.remarks ? cleanNbsp(post.remarks) : undefined
  };

  // 1. Write to Firestore
  try {
    const docRef = doc(db, 'posts', post.id);
    await setDoc(docRef, cleanedPost);
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
      body: JSON.stringify(cleanedPost)
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
  // 1. Try Express backend first because it is super fast with server-side caching
  try {
    const res = await fetch('/api/inquiries');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Express backend inquiries fetch failed, trying direct Firestore:", err);
  }

  // 2. Direct client-side Firestore fallback only if authorized admin
  const isAdmin = auth.currentUser && auth.currentUser.email === 'yunjia2miju@gmail.com';
  if (isAdmin) {
    try {
      const inquiriesRef = collection(db, 'inquiries');
      const q = query(inquiriesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: Inquiry[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Inquiry);
      });
      return list;
    } catch (err) {
      console.warn("Firestore inquiries retrieval failed:", err);
    }
  }

  return [];
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
  // 1. Try Express backend first because it is lightning fast
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Express backend users fetch failed, trying direct Firestore:", err);
  }

  // 2. Direct client-side Firestore fallback
  try {
    const q = query(collection(db, 'registered_users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list: RegisteredUser[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as RegisteredUser);
      });
      return list;
    }
  } catch (err) {
    console.warn("Firestore registered_users fetch failed:", err);
  }

  // 3. Local storage final fallback
  return JSON.parse(localStorage.getItem('taewang_registered_users') || '[]');
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
