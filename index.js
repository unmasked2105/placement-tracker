require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const twilio = require('twilio');

const User = require('./models/User');
const Application = require('./models/Application');
const AppOpenLog = require('./models/AppOpenLog');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
		cb(null, `${Date.now()}_${base}${ext}`);
	}
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Database
const mongoUri = process.env.MONGO_URI || '';
if (!mongoUri) {
	console.error('MongoDB connection error: MONGO_URI is missing in .env');
} else {
	mongoose.connect(mongoUri).then(async () => {
		console.log('MongoDB connected');
		try {
			await Promise.all([
				User.init(),
				Application.init(),
				AppOpenLog.init()
			]);
			console.log('MongoDB indexes initialized');
		} catch (idxErr) {
			console.error('Index initialization error:', idxErr && idxErr.message ? idxErr.message : idxErr);
		}
	}).catch((err) => {
		console.error('MongoDB connection error:', err && err.message ? err.message : err);
	});
}

// Auth middleware
function auth(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.replace('Bearer ', '');
	if (!token) return res.status(401).json({ error: 'No token' });
	try {
		req.user = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
		return next();
	} catch (e) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

// Health
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/db-health', (req, res) => {
	const states = ['disconnected', 'connected', 'connecting', 'disconnecting', 'uninitialized'];
	return res.json({ state: states[mongoose.connection.readyState] || String(mongoose.connection.readyState) });
});

// Auth routes
app.post('/auth/signup', async (req, res) => {
	try {
		const { email, username, password, phoneE164 } = req.body;
		if (!email || !username || !password || !phoneE164) return res.status(400).json({ error: 'Missing fields' });
		const existingEmail = await User.findOne({ email });
		if (existingEmail) return res.status(409).json({ error: 'Email already in use' });
		const existingUsername = await User.findOne({ username });
		if (existingUsername) return res.status(409).json({ error: 'Username already in use' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ email, username, passwordHash, role: 'user', phoneE164 });
		res.json({ ok: true, userId: user._id });
	} catch (e) {
		if (e && e.code === 11000) {
			const field = e.keyPattern ? Object.keys(e.keyPattern)[0] : 'field';
			return res.status(409).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use` });
		}
		res.status(500).json({ error: 'Signup failed' });
	}
});

app.post('/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
		res.json({ token });
	} catch (e) {
		res.status(500).json({ error: 'Login failed' });
	}
});

// File upload
app.post('/upload', auth, upload.single('file'), async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'No file' });
	const fileUrl = `/uploads/${req.file.filename}`;
	res.json({ url: fileUrl });
});

// Applications
app.get('/applications', auth, async (req, res) => {
	const { status } = req.query;
	const q = { userId: req.user.userId };
	if (status) q.status = status;
	const items = await Application.find(q).sort({ createdAt: -1 });
	res.json(items);
});

app.post('/applications', auth, async (req, res) => {
	try {
		const { companyName, websiteUrl, appliedAt, imageUrl, status, notes } = req.body;
		if (!companyName || !websiteUrl || !appliedAt) return res.status(400).json({ error: 'Missing fields' });
		const item = await Application.create({
			userId: req.user.userId,
			companyName,
			websiteUrl,
			appliedAt,
			imageUrl,
			status: status || 'remaining',
			notes
		});
		res.json(item);
	} catch (e) {
		res.status(500).json({ error: 'Create failed' });
	}
});

app.put('/applications/:id', auth, async (req, res) => {
	const { id } = req.params;
	const updated = await Application.findOneAndUpdate(
		{ _id: id, userId: req.user.userId },
		{ $set: req.body },
		{ new: true }
	);
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

app.delete('/applications/:id', auth, async (req, res) => {
	const { id } = req.params;
	const deleted = await Application.findOneAndDelete({ _id: id, userId: req.user.userId });
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	res.json({ ok: true });
});

// Admin middleware
function requireAdmin(req, res, next) {
	if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
	return next();
}

// Admin signup (guarded by ADMIN_SIGNUP_KEY)
app.post('/auth/admin/signup', async (req, res) => {
	try {
		const { email, username, password, phoneE164, adminKey } = req.body;
		if (!email || !username || !password || !phoneE164 || !adminKey) return res.status(400).json({ error: 'Missing fields' });
		if (!process.env.ADMIN_SIGNUP_KEY || adminKey !== process.env.ADMIN_SIGNUP_KEY) return res.status(401).json({ error: 'Invalid admin key' });
		const existingEmail = await User.findOne({ email });
		if (existingEmail) return res.status(409).json({ error: 'Email already in use' });
		const existingUsername = await User.findOne({ username });
		if (existingUsername) return res.status(409).json({ error: 'Username already in use' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ email, username, passwordHash, role: 'admin', phoneE164 });
		res.json({ ok: true, userId: user._id });
	} catch (e) {
		if (e && e.code === 11000) {
			const field = e.keyPattern ? Object.keys(e.keyPattern)[0] : 'field';
			return res.status(409).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use` });
		}
		res.status(500).json({ error: 'Admin signup failed' });
	}
});

// Admin login
app.post('/auth/admin/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email, role: 'admin' });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
		res.json({ token });
	} catch (e) {
		res.status(500).json({ error: 'Login failed' });
	}
});

// Admin: list users
app.get('/admin/users', auth, requireAdmin, async (req, res) => {
	const users = await User.find({}, { email: 1, username: 1, role: 1, createdAt: 1, phoneE164: 1 }).sort({ createdAt: -1 });
	res.json(users);
});

// Admin: list applications (optionally filter by userId or status)
app.get('/admin/applications', auth, requireAdmin, async (req, res) => {
	const { userId, status } = req.query;
	const q = {};
	if (userId) q.userId = userId;
	if (status) q.status = status;
	const apps = await Application.find(q).sort({ createdAt: -1 });
	res.json(apps);
});

// Quick status toggles
app.post('/applications/:id/mark-applied', auth, async (req, res) => {
	const { id } = req.params;
	const updated = await Application.findOneAndUpdate(
		{ _id: id, userId: req.user.userId },
		{ $set: { status: 'applied' } },
		{ new: true }
	);
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

app.post('/applications/:id/mark-remaining', auth, async (req, res) => {
	const { id } = req.params;
	const updated = await Application.findOneAndUpdate(
		{ _id: id, userId: req.user.userId },
		{ $set: { status: 'remaining' } },
		{ new: true }
	);
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

// App open event → send SMS once/day
app.post('/events/app-open', auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.userId);
		if (!user) return res.status(404).json({ error: 'User not found' });
		let log = await AppOpenLog.findOne({ userId: user._id });
		if (!log) log = new AppOpenLog({ userId: user._id, lastSentAt: null });

		const now = new Date();
		const canSend = !log.lastSentAt || (now - log.lastSentAt) > 24 * 60 * 60 * 1000;

		let sent = false;
		if (canSend) {
			const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;
			if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
				const client = twilio(TWILIO_SID, TWILIO_TOKEN);
				await client.messages.create({
					from: TWILIO_FROM,
					to: user.phoneE164,
					body: 'You opened your Placement Tracker. Keep going!'
				});
				sent = true;
			}
			log.lastSentAt = now;
			await log.save();
		}

		res.json({ ok: true, sent });
	} catch (e) {
		res.status(500).json({ error: 'Event failed' });
	}
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
	console.log(`API running on http://localhost:${port}`);
});


