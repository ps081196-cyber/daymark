import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'change-this-development-secret';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: ['personal', 'work', 'health'], default: 'personal' },
  due: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

taskSchema.index({ userId: 1, due: 1 });
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

function issueToken(res, userId) {
  const token = jwt.sign({ userId: userId.toString() }, jwtSecret, { expiresIn: '7d' });
  res.cookie('daymark_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.daymark_token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Session expired' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required' });
    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) return res.status(409).json({ error: 'An account with that email already exists' });
    const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
    issueToken(res, user._id);
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { res.status(500).json({ error: 'Unable to create account' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect' });
  issueToken(res, user._id);
  res.json({ user: { id: user._id, name: user.name, email: user.email } });
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('daymark_token'); res.status(204).end(); });
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } }));

app.get('/api/tasks', requireAuth, async (req, res) => {
  const tasks = await Task.find({ userId: req.user._id }).sort({ completed: 1, due: 1, createdAt: -1 });
  res.json(tasks);
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { title, category, due, priority } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });
  const task = await Task.create({ userId: req.user._id, title: title.trim(), category, due, priority });
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', requireAuth, async (req, res) => {
  const allowed = ['title', 'category', 'due', 'priority', 'completed'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/daymark')
  .then(() => app.listen(port, () => console.log(`Daymark running at http://localhost:${port}`)))
  .catch(error => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
