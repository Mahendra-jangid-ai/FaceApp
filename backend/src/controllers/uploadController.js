const cloudinary = require('cloudinary').v2;
const User = require('../models/User');

// Upload or update profile photo (DP) for a user
const uploadDP = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Upsert — create user doc if not yet synced to MongoDB
    let user = await User.findOne({ appId: userId });
    if (!user) {
      user = await User.create({
        appId: userId,
        name: req.body.name || 'Unknown',
        employeeId: req.body.employeeId || userId,
      });
    }

    // Delete old Cloudinary photo if exists
    if (user.profilePhotoPublicId) {
      await cloudinary.uploader.destroy(user.profilePhotoPublicId);
    }

    // Upload new photo to Cloudinary via stream
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'faceapp/profile_photos',
          public_id: `user_${userId}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(req.file.buffer);
    });

    // Save Cloudinary URL + public_id to MongoDB
    user.profilePhotoUrl = uploadResult.secure_url;
    user.profilePhotoPublicId = uploadResult.public_id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      profilePhotoUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error('uploadDP error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get profile photo URL for a user
const getDP = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ appId: userId }).select(
      'profilePhotoUrl name employeeId',
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      profilePhotoUrl: user.profilePhotoUrl,
      name: user.name,
      employeeId: user.employeeId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadDP, getDP };
