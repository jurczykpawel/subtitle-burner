const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'presets.json');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const RENDERS_DIR = path.join(DATA_DIR, 'renders');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    files: 2
  }
});

const jobs = new Map();
const API_KEY = process.env.API_KEY || '';
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_MS || 1000 * 60 * 60); // 1h
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 1000 * 60 * 60 * 12); // 12h
const tokens = new Map();
const DEFAULT_USER_JOB_LIMIT = Number(process.env.DEFAULT_USER_JOB_LIMIT || 50);
const ALLOWED_FONTS = new Set([
  'Arial',
  'Helvetica',
  'Impact',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Comic Sans MS'
]);

app.use(express.json({ limit: '5mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  if (['/api/health', '/api/users', '/api/auth/token'].includes(req.path)) return next();

  const headerKey = req.header('x-api-key');
  if (API_KEY && headerKey === API_KEY) return next();

  if (headerKey) {
    const users = await readUsers();
    const hashed = hashApiKey(headerKey);
    const user = users.find(u => u.apiKeyHash === hashed);
    if (user) {
      req.userId = user.id;
      return next();
    }
  }

  const authHeader = req.header('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const userId = validateToken(token);
    if (userId) {
      req.userId = userId;
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname)));

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(USERS_FILE, '[]', 'utf-8');
  }
}

async function ensureProjectsDir() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

async function ensureRendersDir() {
  await fs.mkdir(RENDERS_DIR, { recursive: true });
}

async function readPresets() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function readUsers() {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

async function writePresets(presets) {
  await fs.writeFile(DATA_FILE, JSON.stringify(presets, null, 2), 'utf-8');
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateApiKey() {
  return `sbk_${crypto.randomBytes(32).toString('hex')}`;
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function issueToken(userId) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { userId, expiresAt });
  return { token, expiresAt };
}

function validateToken(token) {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return entry.userId;
}

function getNextMonthReset() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

function normalizeUserQuota(user) {
  if (!user.quota) {
    user.quota = { limit: DEFAULT_USER_JOB_LIMIT, used: 0, resetAt: getNextMonthReset() };
    return user;
  }

  const resetAt = new Date(user.quota.resetAt || 0).getTime();
  if (!resetAt || Date.now() >= resetAt) {
    user.quota.used = 0;
    user.quota.resetAt = getNextMonthReset();
  }
  if (!user.quota.limit) {
    user.quota.limit = DEFAULT_USER_JOB_LIMIT;
  }
  if (typeof user.quota.used !== 'number') {
    user.quota.used = 0;
  }
  return user;
}

function consumeUserQuota(user) {
  normalizeUserQuota(user);
  if (user.quota.used >= user.quota.limit) {
    return { allowed: false, remaining: 0 };
  }
  user.quota.used += 1;
  const remaining = Math.max(0, user.quota.limit - user.quota.used);
  return { allowed: true, remaining };
}

function parseSRT(content) {
  const subtitles = [];
  const blocks = content.trim().split(/\n\s*\n/);

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (match) {
        const text = lines.slice(2).join('\n');
        subtitles.push({
          start: timeToSeconds(match[1]),
          end: timeToSeconds(match[2]),
          text
        });
      }
    }
  });

  return subtitles;
}

function timeToSeconds(timeStr) {
  const parts = timeStr.replace(',', ':').split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const ms = parseInt(parts[3], 10);
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

function formatASSTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function createASSFile(subtitles, settings) {
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `&H00${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`;
  };

  const fontFamily = ALLOWED_FONTS.has(settings.fontFamily) ? settings.fontFamily : 'Arial';
  const fontSize = settings.fontSize || 48;
  const fontColor = settings.fontColor || '#FFFFFF';
  const bgColor = settings.bgColor || '#000000';
  const bgOpacity = settings.bgOpacity ?? 70;
  const outlinePx = settings.outlineWidth ?? 4;
  const shadowPx = settings.shadowSize ?? 2;
  const uppercase = settings.uppercase === 'on';
  const position = settings.position ?? 85;

  const textColor = hexToRgb(fontColor);
  const backgroundColor = hexToRgb(bgColor);
  const bgAlpha = Math.round((1 - bgOpacity / 100) * 255).toString(16).padStart(2, '0');
  const alignment = 2;
  const marginV = Math.round((100 - position) * 4);

  let ass = `[Script Info]\nTitle: Subtitle Burner\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${fontFamily},${fontSize},${textColor},${textColor},&H00000000,${backgroundColor}${bgAlpha},-1,0,0,0,100,100,0,0,3,${outlinePx},${shadowPx},${alignment},10,10,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  subtitles.forEach(sub => {
    const start = formatASSTime(sub.start);
    const end = formatASSTime(sub.end);
    const rawText = uppercase ? sub.text.toUpperCase() : sub.text;
    const text = rawText.replace(/[{}]/g, '').replace(/\r/g, '');
    ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  });

  return ass;
}

function validateSettings(input) {
  if (!input || typeof input !== 'object') return {};
  const settings = {};
  const copyString = (key, max = 64) => {
    if (typeof input[key] === 'string') {
      settings[key] = input[key].slice(0, max);
    }
  };
  const copyNumber = (key, min, max) => {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) {
      settings[key] = Math.min(max, Math.max(min, input[key]));
    }
  };

  copyString('fontFamily', 64);
  copyNumber('fontSize', 12, 200);
  copyString('fontColor', 16);
  copyString('bgColor', 16);
  copyNumber('bgOpacity', 0, 100);
  copyNumber('outlineWidth', 0, 20);
  copyNumber('shadowSize', 0, 20);
  copyString('uppercase', 3);
  copyNumber('position', 0, 100);

  return settings;
}

function isVideoFile(file) {
  if (!file) return false;
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
  return allowed.includes(file.mimetype);
}

function isSrtFile(file) {
  if (!file) return false;
  const allowed = ['application/x-subrip', 'text/plain', 'application/octet-stream'];
  return allowed.includes(file.mimetype);
}

function isVideoMagicValid(buffer) {
  if (!buffer || buffer.length < 12) return false;
  // MP4/MOV: 'ftyp' at bytes 4-7
  const ftyp = buffer.slice(4, 8).toString('ascii');
  if (ftyp === 'ftyp') return true;
  // WebM/MKV: EBML header 1A 45 DF A3
  return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
}

async function cleanupJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.delete(jobId);
  try {
    await fs.rm(path.dirname(job.outputPath), { recursive: true, force: true });
  } catch (error) {
    // ignore cleanup errors
  }
}

async function readProject(id) {
  await ensureProjectsDir();
  const filePath = path.join(PROJECTS_DIR, `${id}.json`);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeProject(project) {
  await ensureProjectsDir();
  const filePath = path.join(PROJECTS_DIR, `${project.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
}

async function listProjects() {
  await ensureProjectsDir();
  const entries = await fs.readdir(PROJECTS_DIR);
  const items = [];
  for (const fileName of entries) {
    if (!fileName.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(PROJECTS_DIR, fileName), 'utf-8');
      const project = JSON.parse(raw);
      items.push({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      });
    } catch (error) {
      // ignore invalid file
    }
  }
  return items;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/users', async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const users = await readUsers();
  const apiKey = generateApiKey();
  const user = {
    id: makeId(),
    name: name.trim(),
    apiKeyHash: hashApiKey(apiKey),
    quota: { limit: DEFAULT_USER_JOB_LIMIT, used: 0, resetAt: getNextMonthReset() },
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeUsers(users);

  res.status(201).json({ id: user.id, name: user.name, apiKey });
});

app.get('/api/users/me', async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const users = await readUsers();
  const user = users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  normalizeUserQuota(user);
  await writeUsers(users);
  res.json({ id: user.id, name: user.name, quota: user.quota });
});

app.post('/api/auth/token', async (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'apiKey is required' });
  }

  const users = await readUsers();
  const hashed = hashApiKey(apiKey);
  const user = users.find(u => u.apiKeyHash === hashed);
  if (!user) {
    return res.status(401).json({ error: 'Invalid apiKey' });
  }

  const { token, expiresAt } = issueToken(user.id);
  res.json({ token, expiresAt });
});

app.get('/api/presets', async (_req, res) => {
  const presets = await readPresets();
  res.json(presets);
});

app.get('/api/presets/:id', async (req, res) => {
  const presets = await readPresets();
  const preset = presets.find(item => item.id === req.params.id);
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  res.json(preset);
});

app.post('/api/presets', async (req, res) => {
  const { name, settings } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings are required' });
  }

  const presets = await readPresets();
  const newPreset = {
    id: makeId(),
    name: name.trim(),
    settings,
    createdAt: new Date().toISOString()
  };
  presets.push(newPreset);
  await writePresets(presets);
  res.status(201).json(newPreset);
});

app.put('/api/presets/:id', async (req, res) => {
  const { name, settings } = req.body || {};
  const presets = await readPresets();
  const index = presets.findIndex(item => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  const updated = {
    ...presets[index],
    name: name ? name.trim() : presets[index].name,
    settings: settings || presets[index].settings,
    updatedAt: new Date().toISOString()
  };

  presets[index] = updated;
  await writePresets(presets);
  res.json(updated);
});

app.delete('/api/presets/:id', async (req, res) => {
  const presets = await readPresets();
  const filtered = presets.filter(item => item.id !== req.params.id);
  if (filtered.length === presets.length) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  await writePresets(filtered);
  res.status(204).send();
});

app.get('/api/projects', async (_req, res) => {
  const projects = await listProjects();
  res.json(projects);
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await readProject(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.post('/api/projects', async (req, res) => {
  const { name, srtContent, subtitles, settings } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const project = {
    id: makeId(),
    name: name.trim(),
    srtContent: srtContent || '',
    subtitles: Array.isArray(subtitles) ? subtitles : [],
    settings: settings || {},
    createdAt: new Date().toISOString()
  };

  await writeProject(project);
  res.status(201).json(project);
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const existing = await readProject(req.params.id);
    const { name, srtContent, subtitles, settings } = req.body || {};
    const updated = {
      ...existing,
      name: name ? name.trim() : existing.name,
      srtContent: srtContent ?? existing.srtContent,
      subtitles: Array.isArray(subtitles) ? subtitles : existing.subtitles,
      settings: settings || existing.settings,
      updatedAt: new Date().toISOString()
    };
    await writeProject(updated);
    res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.post('/api/jobs', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'srtFile', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.userId && !API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.userId) {
      const users = await readUsers();
      const user = users.find(u => u.id === req.userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const result = consumeUserQuota(user);
      await writeUsers(users);
      if (!result.allowed) {
        return res.status(429).json({ error: 'LIMIT_EXCEEDED', message: 'Limit renderów na ten okres został wyczerpany.' });
      }
    }
    const videoFile = req.files?.video?.[0];
    if (!videoFile) {
      return res.status(400).json({ error: 'Video file is required' });
    }
    if (!isVideoFile(videoFile)) {
      return res.status(400).json({ error: 'Invalid video file type' });
    }
    if (!isVideoMagicValid(videoFile.buffer)) {
      return res.status(400).json({ error: 'Invalid video file signature' });
    }

    await ensureRendersDir();
    const id = crypto.randomUUID();
    const jobDir = path.join(RENDERS_DIR, id);
    await fs.mkdir(jobDir, { recursive: true });

    const inputPath = path.join(jobDir, 'input.mp4');
    const assPath = path.join(jobDir, 'subtitles.ass');
    const outputPath = path.join(jobDir, 'output.mp4');

    await fs.writeFile(inputPath, videoFile.buffer);

    let rawSettings = {};
    if (req.body.settings) {
      try {
        rawSettings = JSON.parse(req.body.settings);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid settings JSON' });
      }
    }
    const settings = validateSettings(rawSettings);
    let srtContent = req.body.srt || '';

    if (!srtContent && req.files?.srtFile?.[0]) {
      const srtFile = req.files.srtFile[0];
      if (!isSrtFile(srtFile)) {
        return res.status(400).json({ error: 'Invalid SRT file type' });
      }
      srtContent = srtFile.buffer.toString('utf-8');
    }

    if (!srtContent) {
      return res.status(400).json({ error: 'SRT content or file is required' });
    }
    if (srtContent.length > 5_000_000) {
      return res.status(400).json({ error: 'SRT content too large' });
    }

    const presetId = req.body.presetId;
    if (presetId) {
      const presets = await readPresets();
      const preset = presets.find(item => item.id === presetId);
      if (preset) {
        Object.assign(settings, validateSettings(preset.settings));
      }
    }

    const subtitles = parseSRT(srtContent);
    if (subtitles.length > 5000) {
      return res.status(400).json({ error: 'Too many subtitle entries' });
    }
    const assContent = createASSFile(subtitles, settings);
    await fs.writeFile(assPath, assContent, 'utf-8');

    const job = {
      id,
      status: 'queued',
      createdAt: new Date().toISOString(),
      outputPath,
      error: null
    };
    jobs.set(id, job);

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-vf', `ass=${assPath}`,
      '-c:a', 'copy',
      '-preset', 'fast',
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: 'ignore' });
    job.status = 'running';

    ffmpeg.on('error', (error) => {
      job.status = 'failed';
      job.error = error.message;
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
      } else {
        job.status = 'failed';
        job.error = `FFmpeg exited with code ${code}`;
      }
      setTimeout(() => cleanupJob(id), JOB_TTL_MS).unref?.();
    });

    res.status(202).json({ id, status: job.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Render job failed to start' });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ id: job.id, status: job.status, error: job.error });
});

app.get('/api/jobs/:id/download', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Job not completed yet' });
  }

  res.download(job.outputPath, 'video_z_napisami.mp4');
});

app.listen(PORT, () => {
  console.log(`Subtitle Burner running on http://localhost:${PORT}`);
});
