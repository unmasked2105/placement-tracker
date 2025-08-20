const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	email: { type: String, unique: true, required: true },
	username: { type: String, unique: true, required: true },
	passwordHash: { type: String, required: true },
	role: { type: String, enum: ['user', 'admin'], default: 'user' },
	phoneE164: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);


