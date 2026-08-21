const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Matches EnrolledUser from app's types/index.ts
    appId: { type: String, required: true, unique: true }, // id from app
    name: { type: String, required: true },
    employeeId: { type: String, required: true },
    aadhar: { type: String },
    role: { type: String, enum: ['admin', 'worker'], default: 'worker' },
    siteId: { type: String },
    profilePhotoUrl: { type: String, default: null }, // Cloudinary URL
    profilePhotoPublicId: { type: String, default: null }, // Cloudinary public_id
    createdAt: { type: Number }, // timestamp from app
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
