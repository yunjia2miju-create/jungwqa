import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { defaultPosts } from './src/data';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const _filename = typeof __filename !== 'undefined'
  ? __filename
  : fileURLToPath(import.meta.url);

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(_filename);

dotenv.config();

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const projectRoot = _dirname.endsWith('dist') || _dirname.endsWith('dist/')
    ? path.resolve(_dirname, '..')
    : _dirname;

  const DATA_DIR = path.join(projectRoot, 'data');
  const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
  const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Ensure posts.json exists with default posts
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(defaultPosts, null, 2), 'utf-8');
  }

  // Ensure inquiries.json exists
  if (!fs.existsSync(INQUIRIES_FILE)) {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  // Load and initialize Firebase Cloud Database
  const configPath = path.join(projectRoot, 'firebase-applet-config.json');
  let firebaseAdminConfig: any = null;
  let firestoreDb: any = null;

  if (fs.existsSync(configPath)) {
    try {
      firebaseAdminConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error("Error reading firebase-applet-config.json:", e);
    }
  }

  let firestorePermissionFailed = false;
  let useDefaultDbFallback = false;

  if (firebaseAdminConfig && firebaseAdminConfig.projectId) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: firebaseAdminConfig.projectId
        });
      }
      const dbId = firebaseAdminConfig.firestoreDatabaseId;
      const appInstance = admin.apps[0];
      firestoreDb = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);
      
      // Perform a silent startup connection test to determine permission availability
      try {
        await firestoreDb.collection('_test_probe_').limit(1).get();
      } catch (checkErr: any) {
        const errMsg = checkErr.message || "";
        const isPermissionOrDbError = errMsg.includes('PERMISSION_DENIED') || 
                                       errMsg.includes('database') || 
                                       String(checkErr).includes('7') ||
                                       String(checkErr).includes('3');
        if (isPermissionOrDbError && dbId) {
          try {
            const defaultDb = getFirestore(appInstance);
            await defaultDb.collection('_test_probe_').limit(1).get();
            firestoreDb = defaultDb;
            useDefaultDbFallback = true;
          } catch (fallbackErr) {
            firestorePermissionFailed = true;
          }
        } else {
          firestorePermissionFailed = true;
        }
      }
    } catch (err: any) {
      firestorePermissionFailed = true;
    }
  } else {
    firestorePermissionFailed = true;
  }

  // Helper functions for reading/writing
  function readPosts() {
    try {
      if (fs.existsSync(POSTS_FILE)) {
        const data = fs.readFileSync(POSTS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading posts:", err);
    }
    return defaultPosts;
  }

  function writePosts(posts: any) {
    try {
      fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error writing posts:", err);
    }
  }

  function readInquiries() {
    try {
      if (fs.existsSync(INQUIRIES_FILE)) {
        const data = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading inquiries:", err);
    }
    return [];
  }

  function writeInquiries(inqs: any) {
    try {
      fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inqs, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error writing inquiries:", err);
    }
  }
  
  app.use(express.json({ limit: '50mb' }));

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // DB REST API Endpoints
  async function executeFirestoreOp<T>(op: (db: any) => Promise<T>, fallbackValue: T): Promise<T> {
    if (!firestoreDb || firestorePermissionFailed) return fallbackValue;
    try {
      return await op(firestoreDb);
    } catch (err: any) {
      // Quietly fall back to JSON database if any unexpected error occurs
      return fallbackValue;
    }
  }

  app.get('/api/posts', async (req, res) => {
    const list = await executeFirestoreOp(async (dbInstance) => {
      const postsRef = dbInstance.collection('posts');
      const snapshot = await postsRef.orderBy('createdAt', 'desc').get();
      if (!snapshot.empty) {
        const list: any[] = [];
        snapshot.forEach((doc: any) => {
          list.push(doc.data());
        });
        return list;
      } else {
        // Firestore is empty! Seed defaultPosts into Firestore!
        console.log("Firestore posts collection is empty. Seeding defaultPosts...");
        const batch = dbInstance.batch();
        defaultPosts.forEach((post) => {
          const docRef = postsRef.doc(post.id);
          batch.set(docRef, post);
        });
        await batch.commit();
        console.log("Successfully seeded default posts to Firestore!");
        return defaultPosts;
      }
    }, null);

    if (list !== null) {
      res.json(list);
    } else {
      res.json(readPosts());
    }
  });

  app.post('/api/posts', async (req, res) => {
    const postData = req.body;

    // 1. Save to Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('posts').doc(postData.id);
      await docRef.set(postData, { merge: true });
      console.log(`[Firestore Admin] Post successfully saved: ${postData.id}`);
      return true;
    }, false);

    // 2. Save locally as fallback
    let posts = readPosts();
    const existingIndex = posts.findIndex((p: any) => p.id === postData.id);
    if (existingIndex !== -1) {
      posts[existingIndex] = { ...posts[existingIndex], ...postData };
    } else {
      posts = [postData, ...posts];
    }
    writePosts(posts);

    res.json(posts);
  });

  app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;

    // 1. Delete from Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('posts').doc(id);
      await docRef.delete();
      console.log(`[Firestore Admin] Post successfully deleted: ${id}`);
      return true;
    }, false);

    // 2. Delete locally as fallback
    let posts = readPosts();
    posts = posts.filter((p: any) => p.id !== id);
    writePosts(posts);

    res.json(posts);
  });

  app.get('/api/inquiries', async (req, res) => {
    const list = await executeFirestoreOp(async (dbInstance) => {
      const inquiriesRef = dbInstance.collection('inquiries');
      const snapshot = await inquiriesRef.orderBy('createdAt', 'desc').get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        list.push(doc.data());
      });
      return list;
    }, null);

    if (list !== null) {
      res.json(list);
    } else {
      res.json(readInquiries());
    }
  });

  app.post('/api/inquiries', async (req, res) => {
    const inqData = req.body;

    // 1. Save to Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('inquiries').doc(inqData.id);
      await docRef.set(inqData, { merge: true });
      console.log(`[Firestore Admin] Inquiry successfully saved: ${inqData.id}`);
      return true;
    }, false);

    // 2. Save locally as fallback
    let inquiries = readInquiries();
    inquiries = [inqData, ...inquiries];
    writeInquiries(inquiries);

    res.json(inquiries);
  });

  app.post('/api/inquiries/:id/toggle', async (req, res) => {
    const { id } = req.params;

    // 1. Update in Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('inquiries').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const currentProcessed = docSnap.data().processed;
        await docRef.update({ processed: !currentProcessed });
        console.log(`[Firestore Admin] Inquiry toggle successfully: ${id}`);
      } else {
        await docRef.set({ id, processed: true }, { merge: true });
      }
      return true;
    }, false);

    // 2. Update locally as fallback
    let inquiries = readInquiries();
    inquiries = inquiries.map((inq: any) => {
      if (inq.id === id) {
        return { ...inq, processed: !inq.processed };
      }
      return inq;
    });
    writeInquiries(inquiries);

    res.json(inquiries);
  });

  // API 404 Fallback
  // 2FA in-memory storage for admin authentication
  const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

  app.post('/api/v2fa/send', (req, res) => {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins limit
    
    verificationCodes.set('admin', { code, expiresAt });
    console.log(`[2FA SMS LOG] SMS verification code sent to admin phone: ${phone}, code: ${code}`);
    
    res.json({
      success: true,
      message: "인증번호가 문자(SMS)로 발송되었습니다.",
      code: code // Passed to front-end to simulate a real SMS notification toast
    });
  });

  app.post('/api/v2fa/verify', (req, res) => {
    const { code } = req.body;
    const stored = verificationCodes.get('admin');
    
    if (!stored) {
      res.status(400).json({ error: "활성화된 인증 세션이 없습니다. 인증번호를 재발송해 주세요." });
      return;
    }
    
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete('admin');
      res.status(400).json({ error: "인증 유효 시간(5분)이 경과했습니다. 다시 시도해 주세요." });
      return;
    }
    
    if (stored.code !== code.trim()) {
      res.status(400).json({ error: "인증번호 6자리가 정확하지 않습니다." });
      return;
    }
    
    verificationCodes.delete('admin');
    res.json({ success: true, message: "2차 모바일 인증이 최종 완료되었습니다." });
  });

  app.all('/api/*', (req, res) => {
    console.warn(`[404 NOT FOUND] API Route not caught: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API 경로를 찾을 수 없습니다: ${req.url}` });
  });

  // Vite middleware for development or fallback static serving
  const isProd = process.env.NODE_ENV === 'production' || _dirname.endsWith('dist') || _dirname.endsWith('dist/');
  const distPath = isProd
    ? (_dirname.endsWith('dist') || _dirname.endsWith('dist/') ? _dirname : path.join(_dirname, 'dist'))
    : path.join(projectRoot, 'dist');

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`[ERROR] index.html not found in distPath: ${distPath}`);
        res.status(500).send(`📢 index.html을 찾을 수 없습니다. (경로: ${indexPath})`);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

startServer().catch((err) => {
  console.error('💥 Critical error in startServer:', err);
});
