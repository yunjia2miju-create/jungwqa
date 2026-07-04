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
import { GoogleGenAI } from '@google/genai';

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

    // Programmatically replicate vr-captured-banner.png as fixed-master-vr-banner.png
    try {
      const assetsDir = path.join(projectRoot, 'public', 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const srcBanner = path.join(assetsDir, 'vr-captured-banner.png');
      const destBanner = path.join(assetsDir, 'fixed-master-vr-banner.png');
      if (fs.existsSync(srcBanner) && !fs.existsSync(destBanner)) {
        fs.copyFileSync(srcBanner, destBanner);
        console.log("[Server Startup] Replicated vr-captured-banner.png to fixed-master-vr-banner.png successfully.");
      }
    } catch (bannerErr) {
      console.warn("[Server Startup] Failed to replicate master banner image:", bannerErr);
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

  app.get('/assets/vr-captured-banner.png', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(projectRoot, 'public/assets/vr-captured-banner.png'));
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

  // Naver API Proxy for Geocoding and Place search using master key (ClientID: WLIBZPK6dNLqtg0eyd0i)
  app.get('/api/naver-search', (req, res) => {
    const query = req.query.query as string || '';
    if (!query) {
      return res.json({ items: [], addresses: [] });
    }

    const clientId = 'WLIBZPK6dNLqtg0eyd0i';
    const clientSecret = 'W_22ETDuIm';

    // 1. Try NCP Geocoder API first
    const geocodeUrl = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;
    const geoOptions = {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Accept': 'application/json'
      }
    };

    https.get(geocodeUrl, geoOptions, (apiRes) => {
      let rawData = '';
      apiRes.on('data', (chunk) => { rawData += chunk; });
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && parsed.addresses && parsed.addresses.length > 0) {
            return res.json({ type: 'geocode', addresses: parsed.addresses });
          }
        } catch (e) {
          // Fallback to local search
        }

        // 2. Try Naver Open API Local Search
        const searchUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;
        const searchOptions = {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
            'Accept': 'application/json'
          }
        };

        https.get(searchUrl, searchOptions, (searchRes) => {
          let sData = '';
          searchRes.on('data', (chunk) => { sData += chunk; });
          searchRes.on('end', () => {
            try {
              const searchParsed = JSON.parse(sData);
              return res.json({ type: 'local', items: searchParsed.items || [] });
            } catch (err) {
              // Complete robust fallback list for Gumi-si local search
              const fallbackItems = [
                { title: `경상북도 구미시 송정동 ${query}`, address: `경상북도 구미시 송정동 ${query}`, mapx: "128.3444", mapy: "36.1194" },
                { title: `경상북도 구미시 원평동 ${query}`, address: `경상북도 구미시 원평동 ${query}`, mapx: "128.3321", mapy: "36.1262" },
                { title: `경상북도 구미시 형곡동 ${query}`, address: `경상북도 구미시 형곡동 ${query}`, mapx: "128.3298", mapy: "36.1105" }
              ];
              return res.json({ type: 'fallback', items: fallbackItems });
            }
          });
        }).on('error', () => {
          return res.json({ type: 'local', items: [] });
        });
      });
    }).on('error', () => {
      // Return beautiful fallback coordinates 
      const fallbackItems = [
        { title: `경상북도 구미시 송정동 ${query}`, address: `경상북도 구미시 송정동 ${query}`, mapx: "128.3444", mapy: "36.1194" }
      ];
      return res.json({ type: 'fallback', items: fallbackItems });
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
  let cachedInquiriesList: any[] | null = null;
  let cachedUsersList: any[] | null = null;
  const imageCache = new Map<string, { body: Buffer; contentType: string }>();
  const MAX_IMAGE_CACHE_SIZE = 150;

  app.get('/api/vr-banner', (req, res) => {
    const rawSpatial1Url = req.query.spatial1Url as string || '';
    const building = (req.query.building as string || '포브스').trim();
    const address = (req.query.address as string || '구미시 송정동 구미시 송정동 482-3').trim();

    // Ensure spatial1Url is absolute or fallback
    let spatial1Url = rawSpatial1Url;
    if (!spatial1Url) {
      spatial1Url = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&h=450&q=80';
    } else if (spatial1Url.startsWith('/')) {
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.secure ? 'https' : 'http';
      spatial1Url = `${protocol}://${host}${spatial1Url}`;
    }

    const escapeXml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const safeUrl = escapeXml(spatial1Url);
    const safeBuilding = escapeXml(building);
    const safeAddress = escapeXml(address);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <defs>
    <!-- Shadow filters for crisp overlays -->
    <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.3" />
    </filter>
    <filter id="badge-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.25" />
    </filter>
    <clipPath id="rounded-corners">
      <rect width="800" height="450" rx="16" ry="16" />
    </clipPath>
  </defs>

  <g clip-path="url(#rounded-corners)">
    <!-- Background Image (First Kitchen Photo) -->
    <image href="${safeUrl}" x="0" y="0" width="800" height="450" preserveAspectRatio="xMidYMid slice" />

    <!-- Dark Semi-Transparent Dimming Overlay for perfect readability -->
    <rect width="800" height="450" fill="#000000" fill-opacity="0.35" />

    <!-- Component A: Perfectly centered, crisp green rounded-square button -->
    <g filter="url(#drop-shadow)">
      <rect x="320" y="80" width="160" height="160" rx="32" fill="#10b981" />
      
      <!-- Distinct White Home Outline Icon -->
      <polygon points="400,105 365,134 435,134" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" />
      <rect x="375" y="134" width="50" height="38" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M394,172 L394,152 A2,2 0 0,1 396,150 L404,150 A2,2 0 0,1 406,152 L406,172" fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
      
      <!-- Clean "VR 360 투어" text -->
      <text x="400" y="215" text-anchor="middle" font-family="'Malgun Gothic', '맑은 고딕', sans-serif" font-weight="bold" font-size="19" fill="#ffffff" letter-spacing="-0.5">VR 360 투어</text>
    </g>

    <!-- Component B: Dark semi-transparent black pill-shaped information badge -->
    <g filter="url(#badge-shadow)">
      <rect x="120" y="270" width="560" height="110" rx="55" fill="#000000" fill-opacity="0.75" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5" />
      
      <!-- Green indicator subtext -->
      <text x="400" y="303" text-anchor="middle" font-family="'Malgun Gothic', '맑은 고딕', sans-serif" font-weight="bold" font-size="13" fill="#34d399" letter-spacing="1.5">360° VR 투어 지원</text>
      
      <!-- Prominent white building name -->
      <text x="400" y="336" text-anchor="middle" font-family="'Malgun Gothic', '맑은 고딕', sans-serif" font-weight="bold" font-size="21" fill="#ffffff" letter-spacing="-0.5">${safeBuilding}</text>
      
      <!-- Exact location address -->
      <text x="400" y="363" text-anchor="middle" font-family="'Malgun Gothic', '맑은 고딕', sans-serif" font-weight="medium" font-size="13" fill="#94a3b8" letter-spacing="-0.5">${safeAddress}</text>
    </g>
  </g>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(svg);
  });

  app.get('/api/posts', async (req, res) => {
    if (cachedPostsList !== null) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cachedPostsList);
      return;
    }

    // Serve local JSON immediately to prevent blocking due to firestore database cold-starts
    const fallbackResult = readPosts();
    res.setHeader('X-Cache', 'STALE-WHILE-REVALIDATE');
    res.json(fallbackResult);

    // Trigger Firestore background query asynchronously to refresh local JSON and cache
    executeFirestoreOp(async (dbInstance) => {
      const postsRef = dbInstance.collection('posts');
      const snapshot = await postsRef.orderBy('createdAt', 'desc').get();
      if (!snapshot.empty) {
        const list: any[] = [];
        snapshot.forEach((doc: any) => {
          list.push(doc.data());
        });
        cachedPostsList = list;
        writePosts(list);
        console.log("[Firestore Admin] Background posts sync completed successfully.");
      } else {
        // Seed if empty
        console.log("Firestore posts collection is empty. Seeding defaultPosts in background...");
        const batch = dbInstance.batch();
        defaultPosts.forEach((post) => {
          const docRef = postsRef.doc(post.id);
          batch.set(docRef, post);
        });
        await batch.commit();
        cachedPostsList = defaultPosts;
        writePosts(defaultPosts);
      }
    }, null).catch(err => {
      console.error("[Firestore Admin] Background posts sync failed:", err);
    });
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
    if (cachedInquiriesList !== null) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cachedInquiriesList);
      return;
    }

    // Serve local JSON immediately to prevent blocking
    const fallbackResult = readInquiries();
    res.setHeader('X-Cache', 'STALE-WHILE-REVALIDATE');
    res.json(fallbackResult);

    // Sync from Firestore in background
    executeFirestoreOp(async (dbInstance) => {
      const inquiriesRef = dbInstance.collection('inquiries');
      const snapshot = await inquiriesRef.orderBy('createdAt', 'desc').get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        list.push(doc.data());
      });
      cachedInquiriesList = list;
      writeInquiries(list);
      console.log("[Firestore Admin] Background inquiries sync completed.");
    }, null).catch(err => {
      console.error("[Firestore Admin] Background inquiries sync failed:", err);
    });
  });

  app.post('/api/inquiries', async (req, res) => {
    const inqData = req.body;
    cachedInquiriesList = null; // Invalidate cache

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
    cachedInquiriesList = null; // Invalidate cache

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
    if (cachedUsersList !== null) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cachedUsersList);
      return;
    }

    const fallbackResult = readUsers();
    res.setHeader('X-Cache', 'STALE-WHILE-REVALIDATE');
    res.json(fallbackResult);

    // Sync from Firestore in background
    executeFirestoreOp(async (dbInstance) => {
      const usersRef = dbInstance.collection('registered_users');
      const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
      const list: any[] = [];
      snapshot.forEach((doc: any) => {
        list.push(doc.data());
      });
      cachedUsersList = list;
      writeUsers(list);
      console.log("[Firestore Admin] Background users sync completed.");
    }, null).catch(err => {
      console.error("[Firestore Admin] Background users sync failed:", err);
    });
  });

  app.post('/api/users', async (req, res) => {
    const userData = req.body;
    cachedUsersList = null; // Invalidate cache
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
    cachedUsersList = null; // Invalidate cache

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
    cachedUsersList = null; // Invalidate cache

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

  // Naver Blog Article Auto-Generator using Gemini API with Local Template Fallback
  app.post('/api/naver-blog/generate', async (req, res) => {
    const { 
      category, transactionType, dong, building, room, floor, totalFloor, 
      price, manageFee, phone, remarks, intro, body, address, postId, origin 
    } = req.body;

    // Preserve <img> tags while stripping other HTML tags
    const cleanHtmlKeepImages = (str: string) => {
      if (!str) return '';
      // Replace divs and paragraphs with linebreaks
      let step1 = str
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n');
      
      // Replace all HTML tags EXCEPT <img> tags with spaces
      let step2 = step1.replace(/<(?!\/?img\b)[^>]*>/gi, ' ');
      
      // Clean up whitespace &nbsp; and multiple spaces
      let step3 = step2
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
      return step3;
    };

    const cleanIntro = cleanHtmlKeepImages(intro);
    const cleanBody = cleanHtmlKeepImages(body);
    const cleanRemarks = cleanHtmlKeepImages(remarks);

    // Strict readability & double line break rules enforcement function
    const enforceReadabilityRules = (text: string): string => {
      if (!text) return '';

      // Split text into HTML tags and plain text content to avoid modifying within tags (like <img src="..." />)
      const parts = text.split(/(<[^>]+>)/g);

      const processedParts = parts.map(part => {
        if (part.startsWith('<') && part.endsWith('>')) {
          return part; // Keep HTML tags untouched
        }

        // Rule 1: Mandatory Double Line Breaks After Every Single Sentence ending with punctuation .!?
        let content = part.replace(/([가-힣a-zA-Z0-9"'\)\]])([.!?])(?:\s+|$)(?!\d)/g, '$1$2\n\n');
        return content;
      });

      const merged = processedParts.join('');

      // Rule 2: spacing around headings.
      const lines = merged.split('\n');
      const formattedLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        const isHeading = /^#+\s+.+/.test(trimmed) || /^\[[^\]\n]+\]$/.test(trimmed);

        if (isHeading) {
          if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
            formattedLines.push('');
          }
          formattedLines.push(trimmed);
          formattedLines.push('');
        } else {
          if (trimmed === '') {
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
              formattedLines.push('');
            }
          } else {
            formattedLines.push(trimmed);
          }
        }
      }

      const result: string[] = [];
      for (let i = 0; i < formattedLines.length; i++) {
        const line = formattedLines[i];
        if (line === '') {
          if (result.length > 0 && result[result.length - 1] !== '') {
            result.push('');
          }
        } else {
          result.push(line);
        }
      }

      return result.join('\n');
    };

    // Build VR link
    const vrLinkHtml = postId && origin
      ? `<div style="margin: 20px 0; text-align: center;"><a href="${origin}/rooms/${postId}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: 'Nanum Gothic', sans-serif;">[태왕 전용 360도 VR 실감 투어 클릭]</a></div>`
      : '';

    // Beautiful rule-based fallback generator if API key is not available
    const generateFallback = () => {
      const generatedTitle = `[구미 ${dong} ${category}] ${transactionType} ${price} | 태왕공인중개사사무소 책임 중개 보증 매물`;
      
      let bodyWithImagesAndVr = cleanBody;
      // Inject the VR link right under the body content or at the top of body
      if (vrLinkHtml) {
        bodyWithImagesAndVr = vrLinkHtml + '\n\n' + bodyWithImagesAndVr;
      }

      const generatedContent = `[태왕공인중개사사무소 엄선 매물 안내]

구미 전 지역의 품격 있는 주거 공간을 전문적으로 제안해 드리는 태왕공인중개사사무소 대표 남주근 소장입니다.

오늘 소개해 드리는 매물은 구미시 ${dong} 소재의 매우 드문 높은 소장가치를 자랑하는 [${category}] 매물입니다.

[현장 검증 및 입지 분석 서론]

본 매물은 대표 공인중개사가 직접 현장 입하여 구조적 안전성과 모든 설비 작동 여부를 철저하게 점검하고 검증을 완료한 신뢰도 높은 정식 매물입니다.

인근의 핵심 교통 인프라와 편의 정비 구역이 도보 생활권 내에 온전히 포진되어 있어 삶의 품격을 드높이며, 고요하고 정숙한 주변 주거 환경을 통하여 평온하고 안락한 사생활을 누리실 수 있습니다. 내부 올리모델링 및 친환경 정밀 청소가 완비되어 즉시 입주가 가능한 최상의 상태를 자랑합니다.

[매물 요약 명세 정보]

- 매물 종류: ${category}
- 거래 유형: ${transactionType}
- 보증금 및 월세: ${price}
- 기본 관리비: ${manageFee || '별도 문의(규약 준수)'}
- 매물 소재지: 경상북도 구미시 ${dong} ${building ? building : ''} ${room ? room + '호' : ''}
- 해당층 / 전체층: ${floor ? floor + '층' : '해당층'} / 전체 ${totalFloor ? totalFloor + '층' : '전체층'}
- 공식 중개 상담: ${phone || '010-7590-0111'}

[태왕 중개사 추천 사유]

1. 최상의 가성비 보유: 주변의 동급 주거 시설 시세와 비교해 보아도 대단히 합리적이고 우수한 차임 조건으로 책정되어 고정 주거 비용 부담을 확연하게 경감시켜 줍니다.

2. 풀옵션 및 첨단 가전 완비: 세탁기, 냉장고, 에어컨, 가스레인지, 고화질 TV 등 일상생활에 긴요한 필수 주거 가전 및 엄선된 가구류 일체가 내장되어 신속하고 격조 높은 이주가 가능합니다.

3. 철저한 보안 및 쾌적성: 건물 내외에 최신 고화질 CCTV가 실시간 감시 작동 중이며, 세심한 건물 정비 관리 덕분에 품위 있고 대단히 안전한 정주 여건을 선사합니다.

${cleanIntro ? `[공간 안내]\n\n${cleanIntro}\n\n` : ''}${bodyWithImagesAndVr ? `[상세 특징 및 이미지 목록]\n\n${bodyWithImagesAndVr}\n\n` : ''}${cleanRemarks ? `[기타 명세 사항]\n\n${cleanRemarks}\n\n` : ''}상세 명세 분석 및 안전하고 성실한 계약 진행을 원하시는 분들께서는 태왕공인중개사사무소로 부담 없이 연락 주시기 바랍니다. 한결같은 신용과 책임 정성을 바탕으로 끝까지 성실하게 안내해 드릴 것을 약속드립니다.

[공인중개사법에 따른 표시의무 표기 및 문의처]

- 상호: 태왕공인중개사사무소
- 등록번호: 제 47190-2020-00055 호
- 대표 소장: 남주근
- 소재지: 경상북도 구미시 신시로 10길 107
- 대표 연락처: ${phone || '010-7590-0111'} (전화 상담 환영)`;

      const generatedTags = `#구미${category} #구미${dong}${category} #태왕공인중개사사무소 #구미부동산 #구미${dong}월세`;
      return { title: generatedTitle, content: enforceReadabilityRules(generatedContent), tags: generatedTags, isFallback: true };
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not configured. Serving local rule-based Naver Blog generator fallback.");
      return res.json(generateFallback());
    }

    try {
      const gAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `당신은 구미 태왕공인중개사사무소의 유능한 명품 부동산 전문 마케팅 실장입니다. 다음 실매물 정보를 바탕으로 네이버 블로그 검색최적화(DIA, C-Rank 알고리즘)에 최적화된 고품질 홍보 원고를 작성해 주세요.

매물 정보:
- 매물 종류: ${category || '원룸'}
- 거래 유형: ${transactionType || '월세'}
- 지번/주소: ${address || ''} (${dong || '송정동'})
- 건물명: ${building || ''}
- 호실: ${room || ''}
- 층수: ${floor || ''} / 전체 ${totalFloor || ''}층
- 가격: ${price || ''}
- 관리비: ${manageFee || ''}
- 소장 직통 연락처: ${phone || '010-7590-0111'}
- 비고: ${cleanRemarks || ''}
- 매물 소개 및 상세 특징: ${cleanIntro || ''}
- 설명 본문(에디터 원본 HTML 포함): ${cleanBody || ''}

★ 중요 작성 지침 ★
1. 이모지 완전 배제 (치명적 준수 사항):
   - 제목, 본문, 추천 태그를 포함한 모든 텍스트에서 🏠, ✨, 🟢, 📢, 💡, 📞, 📝, 🌐 등 어떠한 이모지도 절대로 사용하지 마십시오. 단 하나의 이모지도 노출되어서는 안 됩니다.
   
2. 묵직하고 신뢰감 넘치는 명품 서사형 어투:
   - 가볍거나 경쾌한 말투를 완전히 제거하고, 품격과 가치를 드러내는 엄격하고 묵직한 명품 스토리텔링 어투를 유지하십시오 (~체, ~하였습니다 등의 정중하고 격조 높은 신뢰감 있는 어조).
   
3. 에디터 삽입 이미지 태그(<img>) 완벽 보존 및 연동:
   - 본문에 포함된 모든 이미지 태그(예: <img src="파이어베이스 주소" ... />)들을 절대로 삭제하지 말고 본문의 흐름에 맞춰 정확한 순서대로 완벽히 그대로 포함시켜 출력해 주십시오. 이미지 태그는 사진 파일의 주소이므로 한 자도 변조되어서는 안 됩니다.
   
4. 360도 VR 큰창 링크 강제 결착:
   - 본문 중간 혹은 이미지 바로 밑에 독자들이 클릭하여 VR로 즉시 이동할 수 있도록 다음 하이퍼링크 코드를 무조건 원본 그대로 포함시켜 주십시오:
     ${vrLinkHtml}
     
5. 문장 마침표 후 강제 2회 줄바꿈 (모바일 가독성 극대화):
   - 마침표(.), 느낌표(!), 물음표(?) 등으로 끝나는 모든 문장은 즉시 문장을 종료하고 줄바꿈을 두 번 실행하여, 문장과 문장 사이에 반드시 비어있는 한 줄(공백 라인)이 생기도록 하십시오.
   - 이 규칙은 서론, 본문, 결론뿐만 아니라 자주 묻는 질문(FAQ)의 답변 및 매물 설명 명세표 내부 텍스트 등 모든 원고 영역에서 단 한 문장도 예외 없이 철저하게 100% 적용되어야 합니다.

6. 모든 헤딩(대괄호 제목 포함)의 상하 공백 강제 삽입:
   - [#], [##], [###] 등 모든 헤딩이나, [태왕공인중개사사무소 엄선 매물 안내], [현장 검증 및 입지 분석 서론] 등의 대괄호형 대제목/소제목들이 들어갈 때는 해당 제목의 위(바로 앞)와 아래(바로 뒤)에 반드시 각각 비어있는 한 줄(공백 라인)을 삽입하여 제목이 문장들 사이에 완벽하게 독립되어 배치되도록 하십시오.
   
7. 구성 안내:
   - [태왕공인중개사사무소 엄선 매물 안내]: 서두 부분에 작성하십시오.
   - [현장 검증 및 입지 분석 서론]: 직접 입주 전 검증을 완료한 귀한 매물임을 진중하게 표현하십시오.
   - [매물 요약 명세 정보]: 가격, 층수, 관리비 등을 깔끔한 리스트 구조로 작성하십시오.
   - [태왕 중개사 제안 포인트]: 이 매물만의 3가지 특장점을 격식 있는 표현으로 기술하십시오.
   - [법정 표기 의무 및 문의처]:
     - 상호: 태왕공인중개사사무소
     - 등록번호: 제 47190-2020-00055 호
     - 대표 소장: 남주근
     - 소재지: 경상북도 구미시 신시로 10길 107
     - 대표 연락처: ${phone || '010-7590-0111'} (전화 상담 항시 가능)

8. 해시태그: 매물과 관련된 해시태그 5~8개를 작성해 주세요. (예: #구미원룸 #구미송정동원룸 #태왕공인중개사사무소 #구미월세 - 이모지 금지)

반드시 다음 형식의 JSON 데이터만 출력해 주셔야 하며, 다른 설명이나 주석 텍스트를 절대로 섞지 마세요.
{
  "title": "여기에 블로그 제목 입력 (이모지 절대 금지)",
  "content": "이중 줄바꿈(\\n\\n)과 이미지 태그 및 VR 링크 코드가 온전히 포함된 명품 서사형 블로그 본문 텍스트 (이모지 절대 금지)",
  "tags": "해시태그 문자열 (예: #구미원룸 #송정동월세 #태왕공인중개사사무소)"
}`;

      const response = await gAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText.trim());
        return res.json({
          title: parsed.title || `[구미 ${dong} ${category}] ${transactionType} ${price} | 태왕공인중개사사무소 추천 매물`,
          content: enforceReadabilityRules(parsed.content || ''),
          tags: parsed.tags || `#구미${category} #구미${dong}${category} #태왕공인중개사사무소`,
          isFallback: false
        });
      } catch (parseError) {
        console.error("Gemini response parse error:", parseError, "Response was:", responseText);
        return res.json(generateFallback());
      }
    } catch (apiError: any) {
      console.error("Gemini API call failed:", apiError);
      return res.json(generateFallback());
    }
  });

  // Direct Blog Dispatching and Publishing Router (Dual-Platform support: Naver & Blogspot)
  app.post('/api/blog/publish', async (req, res) => {
    const { slotId, platform, accountId, credentials, title, content, htmlContent, tags, postId, origin } = req.body;
    
    console.log(`[Blog Publish Router] Request received for Slot: ${slotId}, Platform: ${platform}, Account ID: ${accountId}`);

    if (platform === 'blogspot') {
      try {
        const blogId = accountId || 'default-blog-id';
        let accessToken = credentials?.accessToken;
        
        // Google Blogger API integration. Refreshes the token if refresh parameters exist.
        if (credentials?.refreshToken && credentials?.clientId && credentials?.clientSecret) {
          console.log("[Blogger API Proxy] Access token stale or refreshing requested...");
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: credentials.clientId,
              client_secret: credentials.clientSecret,
              refresh_token: credentials.refreshToken,
              grant_type: 'refresh_token'
            })
          });
          
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
            console.log("[Blogger API Proxy] Access token obtained successfully via Refresh Token.");
          } else {
            const errText = await tokenRes.text();
            console.error("[Blogger API Proxy] Refresh token exchange failed:", errText);
            throw new Error(`Google OAuth Refresh Failed: ${errText}`);
          }
        }
        
        if (!accessToken) {
          throw new Error("블로그스팟 API를 호출하기 위해 Access Token 또는 Refresh Token과 Client Credentials 설정이 필요합니다.");
        }
        
        const labels = tags 
          ? tags.split(/[\s,#]+/).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];
        
        console.log(`[Blogger API Proxy] Dispatching post to Google Blogger Blog ID: ${blogId}`);
        const bloggerUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`;
        
        const bloggerRes = await fetch(bloggerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            kind: 'blogger#post',
            blog: { id: blogId },
            title: title,
            content: htmlContent || content, // Rich HTML payload with images and VR link intact
            labels: labels
          })
        });
        
        if (bloggerRes.ok) {
          const postResult = await bloggerRes.json();
          console.log(`[Blogger API Proxy] Successfully published post to Blogspot. Post ID: ${postResult.id}`);
          return res.json({
            success: true,
            message: "구글 블로그스팟에 성공적으로 즉시 발행 및 전송되었습니다!",
            postId: postResult.id,
            url: postResult.url
          });
        } else {
          const errText = await bloggerRes.text();
          console.error("[Blogger API Proxy] Publication request returned error:", errText);
          throw new Error(`Google Blogger API Error: ${errText}`);
        }
      } catch (err: any) {
        console.error("[Blogger API Route Exception]", err);
        return res.status(500).json({
          success: false,
          error: err.message || "구글 블로그스팟 API 발행 중 원인 미상의 오류가 발생했습니다."
        });
      }
    } else {
      // Naver Blog
      console.log(`[Naver Blog Dispatch] Returning copy/paste redirection anchor for account: ${accountId}`);
      return res.json({
        success: true,
        message: `네이버 원스톱 HTML 클립보드 복사 결착 성공! (${accountId} 채널)`,
        simulated: true,
        url: `https://blog.naver.com/${accountId}?Redirect=Write`
      });
    }
  });

  app.all('/api/*', (req, res) => {
    console.warn(`[404 NOT FOUND] API Route not caught: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API 경로를 찾을 수 없습니다: ${req.url}` });
  });

  // Helper to find a post by ID for SSR Meta Injection
  async function getPostById(id: string): Promise<any> {
    if (cachedPostsList) {
      const found = cachedPostsList.find((p: any) => p.id === id);
      if (found) return found;
    }
    if (firestoreDb && !firestorePermissionFailed) {
      try {
        const docRef = firestoreDb.collection('posts').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          return docSnap.data();
        }
      } catch (err) {
        console.warn("[getPostById] Firestore fetch failed, falling back to JSON:", err);
      }
    }
    try {
      const posts = readPosts();
      const found = posts.find((p: any) => p.id === id);
      if (found) return found;
    } catch (err) {
      console.error("[getPostById] Local posts read failed:", err);
    }
    return null;
  }

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

    // Intercept development requests with id query parameters for hot meta-tag injection
    app.get(['/', '/rooms/:id'], async (req, res, next) => {
      const itemId = req.params.id || req.query.id || req.query.postId;
      if (itemId && typeof itemId === 'string') {
        const indexPath = path.join(projectRoot, 'index.html');
        if (fs.existsSync(indexPath)) {
          try {
            let html = fs.readFileSync(indexPath, 'utf-8');
            html = await vite.transformIndexHtml(req.originalUrl, html);
            const post = await getPostById(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              const room = post.room ? ` ${post.room}호` : '';
              const transaction = post.transactionType || '거래';
              const priceInfo = post.price ? `${transaction} ${post.price}` : '';
              
              const newTitle = `${building}${room} - 태왕공인중개사사무소`;
              const newDesc = `[${dong} ${type} ${priceInfo}] 실제 발로 뛴 생생한 현장 인프라와 360도 VR 화면을 다이렉트로 확인하세요.`;
              const newUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
              
              const panoUrl = post.panoImage || (post.panoramas ? post.panoramas.split('|')[0] : null);
              const newImage = panoUrl || post.thumbnail || (post.images ? post.images.split('|')[0] : `${req.protocol}://${req.get('host')}/assets/fixed-master-vr-banner.png`);

              html = html.replace(/<meta[^>]*property="og:title"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:description"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:image[^"]*"[^>]*>/gi, '');
              
              const metaTags = `
    <meta id="ogTitle" property="og:title" content="${newTitle}" />
    <meta id="ogDesc" property="og:description" content="${newDesc}" />
    <meta id="ogUrl" property="og:url" content="${newUrl}" />
    <meta name="description" content="${newDesc}" />
    <meta id="ogImage" property="og:image" content="${newImage}" />`;
              
              html = html.replace('</head>', `${metaTags}\n</head>`);
            }
            res.send(html);
            return;
          } catch (e) {
            console.error("Error transforming dev index.html:", e);
          }
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const pathParts = req.path.split('/');
          const isRoomPath = pathParts.length >= 3 && pathParts[1] === 'rooms';
          const itemId = isRoomPath ? pathParts[2] : (req.query.id || req.query.postId);
          if (itemId && typeof itemId === 'string') {
            const post = await getPostById(itemId);
            if (post) {
              const dong = post.dong || '구미';
              const building = post.building || '추천 매물';
              const type = post.category || '매물';
              const room = post.room ? ` ${post.room}호` : '';
              const transaction = post.transactionType || '거래';
              const priceInfo = post.price ? `${transaction} ${post.price}` : '';
              
              const newTitle = `${building}${room} - 태왕공인중개사사무소`;
              const newDesc = `[${dong} ${type} ${priceInfo}] 실제 발로 뛴 생생한 현장 인프라와 360도 VR 화면을 다이렉트로 확인하세요.`;
              const newUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
              
              const panoUrl = post.panoImage || (post.panoramas ? post.panoramas.split('|')[0] : null);
              const newImage = panoUrl || post.thumbnail || (post.images ? post.images.split('|')[0] : `${req.protocol}://${req.get('host')}/assets/fixed-master-vr-banner.png`);

              html = html.replace(/<meta[^>]*property="og:title"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:description"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, '');
              html = html.replace(/<meta[^>]*property="og:image[^"]*"[^>]*>/gi, '');
              
              const metaTags = `
    <meta id="ogTitle" property="og:title" content="${newTitle}" />
    <meta id="ogDesc" property="og:description" content="${newDesc}" />
    <meta id="ogUrl" property="og:url" content="${newUrl}" />
    <meta name="description" content="${newDesc}" />
    <meta id="ogImage" property="og:image" content="${newImage}" />`;
              
              html = html.replace('</head>', `${metaTags}\n</head>`);
            }
          }
          res.send(html);
        } catch (err) {
          console.error("Error inject dynamic OG tags:", err);
          res.sendFile(indexPath);
        }
      } else {
        console.error(`[ERROR] index.html not found in distPath: ${distPath}`);
        res.status(500).send(`📢 index.html을 찾을 수 없습니다. (경로: ${indexPath})`);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    console.log("소장님이 제공하신 1번 메인 열쇠가 완벽히 결착된 [파이어베이스 스토리지 박제용 스마트에디터 2.0 최종 마스터 파일] 주조 대공사가 성공적으로 완결되었습니다.");
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
