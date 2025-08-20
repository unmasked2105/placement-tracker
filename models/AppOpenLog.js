const mongoose = require('mongoose');

const appOpenLogSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
	lastSentAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('AppOpenLog', appOpenLogSchema);


