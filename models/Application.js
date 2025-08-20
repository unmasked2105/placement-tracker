const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
	companyName: { type: String, required: true },
	websiteUrl: { type: String, required: true },
	appliedAt: { type: Date, required: true },
	imageUrl: { type: String },
	status: { type: String, enum: ['remaining', 'applied'], default: 'remaining' },
	notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);


