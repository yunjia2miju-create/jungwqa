import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Dynamically load sharp at runtime instead of statically at startup to prevent native binary crashing in container environments

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
  const port = 3000;

  const projectRoot = _dirname.endsWith('dist') || _dirname.endsWith('dist/')
    ? path.resolve(_dirname, '..')
    : _dirname;

  const DATA_DIR = path.join(projectRoot, 'data');
  const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
  const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
  const USERS_FILE = path.join(DATA_DIR, 'users.json');

  // Ensure data directory exists with robust read-only fallback to prevent startup/deploy crashes
  try {
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

    // Ensure users.json exists
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (fsErr) {
    console.warn("[Cloud Run Startup] Cannot write local data files on read-only file system, serving safely from memory.", fsErr);
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

  function readUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading users:", err);
    }
    return [];
  }

  function writeUsers(users: any) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error writing users:", err);
    }
  }
  
  app.use(express.json({ limit: '50mb' }));

  // Assets-to-Giphy mapping redirect route to ensure 0 broken images when embedding local path stickers
  const stickerRedirects: Record<string, string> = {
    // 강아지 (동물)
    'rabbit_cheer.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif',
    'puppy_welcome.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTNjOWVzMXhyeTkybml0djFud3gyY2UwdzEzbWVydXBzeHN0bm42byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/YmMLWYr9lM1shv8IZS/giphy.gif',
    'cat_happy.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3U2cjRvdWwzdng5dngyam5na2Nzd3UxbW5hbzd0dW1sbDBubW9uZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/t3pXRb93P2fWjD2Vea/giphy.gif',
    'hamster_dance.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3pnb210dWZpYW0xeXpxZWgyZXVobnY0YWVpaXBtZnd3N2s1cGgzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Lp9b8D7pGIU7FmEgVv/giphy.gif',
    'bear_greeting.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZhdThhdnlybHhzZHJqNHA1cGU3djMxbmsxaXN3NGNidjR3MDR2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7k9MbeuPLaN7nka0n4/giphy.gif',
    'tiger_roar.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm5nOWp0aDU2dms4MWxsNWJpdm1naXB0MHpqeTZ3aDMxZ3YycHJidCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/j5bTMy6H70Y7Z5L2Qe/giphy.gif',

    // 생줘 (하트)
    'heart_flutter.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ5dzVpcWNhdGF0OGptMDBzdmM2cWswcWhxYzN0eTZpNDJpcnF6ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g6G6O8pXNTheBwW71/giphy.gif',
    'sparkle_love.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGoyOTFrNHh6NHo0NWMxbWF2cHh5dWl0MmoyOHYxbXFidTNmZHNvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xUPGcyi6Y8sK_78676/giphy.gif',
    'star_twinkle.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6NG95NnU4NmIyamZncmswZWdzbmtnbmpzdDBpODN6OG0wanRxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/eNhZ1gZf5Ym7mYgE4D/giphy.gif',
    'glowing_heart.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXdyZjY1bm9yZWZwd2gyN3UwbHR2ZXZiZW52dnA5djM0d2lrcml5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8YmIsOfcZkLgRSpf2/giphy.gif',
    'love_arrow.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmF0MXF3a2M5Mm55bm8wdWd4bjF3azg1dnd5NWwyczRnbXl6bnU3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SDeO6gL98gAsPZ10fB/giphy.gif',
    'sweet_candy.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZsd3Zldm5iNHVvMXg5NHgyb3d4Zmg3dm1nbmF2Nnl3YTBzZWJvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LpsYVv9yS7jLpY2pG1/giphy.gif',

    // 가격 (부동산)
    'house_zoom.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWFqdmtoczhxdWFxMHBqZXpxYXM1YmV0Ymdod28ybncyMnY3NDVwdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L37FfWog394W4oT2v7/giphy.gif',
    'key_deal.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTV3bXNocmszcHk2ajZidWVzb3ZnaXNxOHlndmlhdzZpcHpwMTVubCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/TAnRscyvOf3W7fL62W/giphy.gif',
    'moving_truck.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNVlqNnM1NnU0OG93djB1NGc3dngxeXU0cmEwbDZ4ZjN0ZGl3bTM1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XFm66N3oXw2yF9tS9g/giphy.gif',
    'apartment_search.png': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=150&h=150&q=80',
    'home_sweet_home.jpg': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=150&h=150&q=80',
    'office_building.jpg': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&h=150&q=80',

    // 소장님일상
    'thumbs_up.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNleWF2eTBvODQ3NDBzcmwxaXQ2dDN1ajdwdWNxYmxoMjdzMnZ3byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/R6gVNv59V9htKzSu4R/giphy.gif',
    'coffee_steam.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDhneTJocTlncGtzMWpsNXpuZHJpYXJ6aGRiaDJiaXNuNW1sbnAwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/D1O1Tj39fS4y7yS6S9/giphy.gif',
    'stamp_verified.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjU5bm1tNHhrdjMyYnl4bWNqMnlrczZsczByNGI2ZnNpNjJodjRxNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bYv1840JclX666Vq1D/giphy.gif',
    'congrats_star.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjEyZDNndW55OGZ5bjNpZnpicnBnOGpjenoyZmZpOHpyZjU3dTh3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0G18bMuxT9Je1fDG/giphy.gif',
    'busy_typing.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDJwbmNpbm12NDlzd200czY1ejc0b3pxa2NleTNmaTdzM2owZzA5MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/du3J3USyVJvOkmSMFL/giphy.gif',
    'success_star.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTVudTFzcmYxcnA2dDlxNjBia2EwbzRhb2E4aThjcnV1ZHZpeXN5MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WfofOAg88MHeo/giphy.gif',

    // 파스인형 (24종)
    'pas01_heart_eyes.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXdyZjY1bm9yZWZwd2gyN3UwbHR2ZXZiZW52dnA5djM0d2lrcml5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8YmIsOfcZkLgRSpf2/giphy.gif',
    'pas02_angry_fire.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWZnaWx0OXN5NjZwdXpxMWVsbGswMXFwbzFmdmlxbzY2ODdzYThxeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bMyWfIDYLQqC4/giphy.gif',
    'pas03_double_thumbs.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmNleWF2eTBvODQ3NDBzcmwxaXQ2dDN1ajdwdWNxYmxoMjdzMnZ3byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/R6gVNv59V9htKzSu4R/giphy.gif',
    'pas04_dessert_mukbang.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmF0MXF3a2M5Mm55bm8wdWd4bjF3azg1dnd5NWwyczRnbXl6bnU3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LpsYVv9yS7jLpY2pG1/giphy.gif',
    'pas05_deep_sleep.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVtcXZ5Njg1N3g2NGE5OTNtbGRod29kNG93cTltODkzbHppZHZsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/EZAX8gbyzVAnK/giphy.gif',
    'pas06_fist_clenched.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNmYjZ4OGI0ZXZ4MWh4Z3p5YW8yd2I3czF6bW02ZWl5cWF2ZWdpeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1VXD3bEoZBAUPcfVw/giphy.gif',
    'pas07_tears_pouring.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBrdGowZWg4OXpybHoxZXExNnFlZHl2MThnd3ZnbHh0bWltNnIydyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/2Qs2h97WaoBiM/giphy.gif',
    'pas08_startled_gasp.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJ2dnFkMzdnNnd4Nm5vZXphMWZ3eG8wdHRjMndna3NvdWx1MHBnNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/mlvseq9yvZhba/giphy.gif',
    'pas09_warm_hello.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTNjOWVzMXhyeTkybml0djFud3gyY2UwdzEzbWVydXBzeHN0bm42byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/YmMLWYr9lM1shv8IZS/giphy.gif',
    'pas10_excited_dance.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3pnb210dWZpYW0xeXpxZWgyZXVobnY0YWVpaXBtZnd3N2s1cGgzeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Lp9b8D7pGIU7FmEgVv/giphy.gif',
    'pas11_utterly_exhausted.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ5dzVpcWNhdGF0OGptMDBzdmM2cWswcWhxYzN0eTZpNDJpcnF6ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g6G6O8pXNTheBwW71/giphy.gif',
    'pas12_fireworks_congrats.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjEyZDNndW55OGZ5bjNpZnpicnBnOGpjenoyZmZpOHpyZjU3dTh3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0G18bMuxT9Je1fDG/giphy.gif',
    'pas13_belly_laugh.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3U2cjRvdWwzdng5dngyam5na2Nzd3UxbW5hbzd0dW1sbDBubW9uZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/t3pXRb93P2fWjD2Vea/giphy.gif',
    'pas14_shy_blush.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzh0cHlzYjBzdDBoOWptbXlzM2Z1cWR3bmlkaTJ5Nnp1ZHFicmhveSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/H887b8X9Y7vSpT4qE7/giphy.gif',
    'pas15_sweet_wink.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWM5eTNrMDFtd3NseWlraXp2cmU5dW9uMmh3NDAwMGx0ZjRlcm90dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Q7YFxgjPv9L8P5wB9p/giphy.gif',
    'pas16_deep_thinking.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTV2OWpqMG5nbzRhNDRxNjYxenBlcDZ3ZXJ4dHlnaG5pd2psaDZrYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif',
    'pas17_raining_gold.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm53bzdqYjM3dmhicmRsa3E2dDNpa3BrMXF4NDlzaWxlYnVwbmsxbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0Ex6Ut3wAHcnGCkg/giphy.gif',
    'pas18_loyal_salute.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjZqNnM0MXoxcmZ5M3Q3bnd4b3F4amkzbWN5bnlhNzR2Y3M0dzVubCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/j77bDXz3sh6Xv9Dqfc/giphy.gif',
    'pas19_great_job.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6NG95NnU4NmIyamZncmswZWdzbmtnbmpzdDBpODN6OG0wanRxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/eNhZ1gZf5Ym7mYgE4D/giphy.gif',
    'pas20_hurried_run.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXlqNnM1NnU0OG93djB1NGc3dngxeXU0cmEwbDZ4ZjN0ZGl3bTM1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XFm66N3oXw2yF9tS9g/giphy.gif',
    'pas21_cupid_arrow.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGoyOTFrNHh6NHo0NWMxbWF2cHh5dWl0MmoyOHYxbXFidTNmZHNvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xUPGcyi6Y8sK_78676/giphy.gif',
    'pas22_go_fighting.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTVudTFzcmYxcnA2dDlxNjBia2EwbzRhb2E4aThjcnV1ZHZpeXN5MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WfofOAg88MHeo/giphy.gif',
    'pas23_coffee_break.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDhneTJocTlncGtzMWpsNXpuZHJpYXJ6aGRiaDJiaXNuNW1sbnAwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/D1O1Tj39fS4y7yS6S9/giphy.gif',
    'pas24_desperate_prayer.gif': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDN6bTgydDR3M3FicXBwZ251Z3JqYnF5ZXAzdHF1cHhtNzAzbTNzNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/9SqtqOdxfUafE_S77x/giphy.gif'
  };

  app.get('/assets/stickers/:filename', (req, res) => {
    const filename = req.params.filename;
    const targetUrl = stickerRedirects[filename];
    if (targetUrl) {
      res.redirect(302, targetUrl);
    } else {
      res.status(404).send('Sticker not found locally');
    }
  });

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // DB REST API Endpoints
  const serverLogs: string[] = [];
  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    serverLogs.push(formatted);
    if (serverLogs.length > 500) {
      serverLogs.shift();
    }
  };

  app.get('/api/diagnostics', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      firestoreStatus: {
        initialized: !!firestoreDb,
        permissionFailed: firestorePermissionFailed,
      },
      cacheSize: imageCache.size,
      logs: serverLogs
    });
  });

  async function executeFirestoreOp<T>(op: (db: any) => Promise<T>, fallbackValue: T): Promise<T> {
    if (!firestoreDb || firestorePermissionFailed) return fallbackValue;
    try {
      return await op(firestoreDb);
    } catch (err: any) {
      // Quietly fall back to JSON database if any unexpected error occurs
      return fallbackValue;
    }
  }

  // Cache variables
  let cachedPostsList: any[] | null = null;
  const imageCache = new Map<string, { body: Buffer; contentType: string }>();
  const MAX_IMAGE_CACHE_SIZE = 150;

  app.get('/api/posts', async (req, res) => {
    if (cachedPostsList !== null) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cachedPostsList);
      return;
    }

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
      cachedPostsList = list;
      res.setHeader('X-Cache', 'MISS');
      res.json(list);
    } else {
      const fallbackResult = readPosts();
      cachedPostsList = fallbackResult;
      res.setHeader('X-Cache', 'MISS-FALLBACK');
      res.json(fallbackResult);
    }
  });

  app.post('/api/posts', async (req, res) => {
    const postData = req.body;
    cachedPostsList = null; // Invalidate cache

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
    cachedPostsList = null; // Invalidate cache

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

  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl || typeof imageUrl !== 'string') {
      res.status(400).send('URL query parameter is required');
      return;
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      res.status(400).send('Invalid URL format');
      return;
    }

    // CORS & CORS-Resource-Policy Header Setup to satisfy rigid browser WebGL texture contexts
    const clientOrigin = req.get('Origin') || req.get('Referer') || '*';
    let cleanOrigin = '*';
    if (clientOrigin !== '*') {
      try {
        const urlObj = new URL(clientOrigin);
        cleanOrigin = urlObj.origin;
      } catch (e) {
        cleanOrigin = clientOrigin;
      }
    }
    res.setHeader('Access-Control-Allow-Origin', cleanOrigin);
    if (cleanOrigin !== '*') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    // Check Memory Cache First
    if (imageCache.has(imageUrl)) {
      const cached = imageCache.get(imageUrl)!;
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Vary', 'Origin');
      res.setHeader('X-Proxy-Cache', 'HIT');
      res.send(cached.body);
      return;
    }

    addLog(`[Proxy-Image] Initializing proxy download for: ${imageUrl}`);

    const downloadImage = (url: string, depth = 0): Promise<{ body: Buffer; contentType: string }> => {
      return new Promise((resolve, reject) => {
        if (depth > 5) {
          reject(new Error('Too many redirects'));
          return;
        }

        const client = url.startsWith('https://') ? https : http;
        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        };

        client.get(url, options, (response) => {
          const { statusCode } = response;

          // Handle Redirects natively and follow them
          if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              addLog(`[Proxy-Image] Following redirect (${statusCode}) to: ${redirectUrl}`);
              downloadImage(redirectUrl, depth + 1).then(resolve).catch(reject);
              return;
            }
          }

          if (statusCode && statusCode >= 400) {
            reject(new Error(`Server returned status code ${statusCode}`));
            return;
          }

          const contentType = response.headers['content-type'] || 'image/jpeg';
          const chunks: Buffer[] = [];

          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', () => {
            const body = Buffer.concat(chunks);
            resolve({ body, contentType });
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
    };

    try {
      const { body, contentType } = await downloadImage(imageUrl);

      addLog(`[Proxy-Image] Successfully downloaded image data (${body.length} bytes, type: ${contentType}) for ${imageUrl}`);

      let finalBody = body;
      let finalContentType = contentType;

      if (contentType.startsWith('image/')) {
        try {
          // Dynamic import to prevent startup binary crashes on minimal machines
          const { default: sharp } = await import('sharp');
          const imageInstance = sharp(body);
          const metadata = await imageInstance.metadata();
          
          if (metadata.width && metadata.width > 3840) {
            addLog(`[Proxy-Image] Dimension ${metadata.width}x${metadata.height} exceeds optimal WebGL performance target (3840). Resizing beautifully...`);
            finalBody = await imageInstance
              .resize({ width: 3840, withoutEnlargement: true })
              .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
              .toBuffer();
            finalContentType = 'image/jpeg';
            addLog(`[Proxy-Image] Resize completed. New size: ${finalBody.length} bytes.`);
          }
        } catch (sharpErr: any) {
          addLog(`[Proxy-Image] Image analyzer/optimizer skipped or failed (safe fallback to raw serving): ${sharpErr.message}`);
        }
      }

      // Evict oldest cache item if maximum memory caching threshold reached
      if (imageCache.size >= MAX_IMAGE_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value;
        if (firstKey) imageCache.delete(firstKey);
      }
      imageCache.set(imageUrl, { body: finalBody, contentType: finalContentType });

      res.setHeader('Content-Type', finalContentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Vary', 'Origin');
      res.setHeader('X-Proxy-Cache', 'MISS');
      res.send(finalBody);
    } catch (err: any) {
      addLog(`[Proxy-Image] Exception caught during proxy fetch: ${err?.message || String(err)} for ${imageUrl}`);
      // Return 502 Bad Gateway instead of 302 redirecting to a CORS-blocked Firebase domain.
      // This allows the front-end Pannellum viewer's errorCallback to fail cleanly and auto-fallback to Flat Mode.
      res.status(502).send('Failed to proxy fetch the 360 image. Falling back to flat corrective mode.');
    }
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

  // --- Users API ---
  app.get('/api/users', async (req, res) => {
    const list = await executeFirestoreOp(async (dbInstance) => {
      const usersRef = dbInstance.collection('registered_users');
      const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        list.push(doc.data());
      });
      return list;
    }, null);

    if (list !== null) {
      res.json(list);
    } else {
      res.json(readUsers());
    }
  });

  app.post('/api/users', async (req, res) => {
    const userData = req.body;
    if (!userData.email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // 1. Save to Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('registered_users').doc(userData.email);
      await docRef.set(userData, { merge: true });
      console.log(`[Firestore Admin] User registered/updated: ${userData.email}`);
      return true;
    }, false);

    // 2. Save locally as fallback
    let users = readUsers();
    const existingIndex = users.findIndex((u: any) => u.email === userData.email);
    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...userData };
    } else {
      users = [userData, ...users];
    }
    writeUsers(users);

    res.json(users);
  });

  app.post('/api/users/:email/toggle', async (req, res) => {
    const { email } = req.params;

    // 1. Update in Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('registered_users').doc(email);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const currentApproved = docSnap.data().approved;
        await docRef.update({ approved: !currentApproved });
        console.log(`[Firestore Admin] User approved toggle: ${email}`);
      } else {
        // Fallback or update if not exist in Firestore but exists locally
        let users = readUsers();
        const localUser = users.find((u: any) => u.email === email);
        if (localUser) {
          const newApproved = !localUser.approved;
          await docRef.set({ ...localUser, approved: newApproved }, { merge: true });
          console.log(`[Firestore Admin] User created and approved in firestore: ${email}`);
        }
      }
      return true;
    }, false);

    // 2. Update locally as fallback
    let users = readUsers();
    users = users.map((u: any) => {
      if (u.email === email) {
        return { ...u, approved: !u.approved };
      }
      return u;
    });
    writeUsers(users);

    res.json(users);
  });

  app.delete('/api/users/:email', async (req, res) => {
    const { email } = req.params;

    // 1. Delete from Cloud Firestore
    await executeFirestoreOp(async (dbInstance) => {
      const docRef = dbInstance.collection('registered_users').doc(email);
      await docRef.delete();
      console.log(`[Firestore Admin] User deleted: ${email}`);
      return true;
    }, false);

    // 2. Delete locally as fallback
    let users = readUsers();
    users = users.filter((u: any) => u.email !== email);
    writeUsers(users);

    res.json(users);
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
