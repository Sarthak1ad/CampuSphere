/**
 * AUTH CONTROLLER
 * ---------------
 * Handles: register, login, getMe, updateProfile, changePassword
 *
 * MongoDB Concepts used:
 *  - Pre-save hook (password hashing) — triggered on User.save()
 *  - Instance method (comparePassword) — called on user document
 *  - Unique index — email uniqueness enforced by MongoDB (code 11000)
 *  - select: false — passwordHash excluded by default, must explicitly include
 */
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { auditLog } = require('../services/auditService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// ── Helper: Generate JWT ──────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── Helper: Send token response ───────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // Build safe user object (no passwordHash)
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    interests: user.interests,
    avatar: user.avatar,
    organizerProfile: user.organizerProfile,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData,
    data: {
      token,
      user: userData,
    },
  });
};

// ── REGISTER ──────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  // Validate request body with express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { name, email, password, phone, role, interests } = req.body;
  const orgName = req.body.orgName || req.body.organizerProfile?.orgName || (role === 'organizer' ? name : undefined);
  const registrationNumber = req.body.registrationNumber || req.body.organizerProfile?.registrationNumber || (role === 'organizer' ? `REG-${Date.now().toString().slice(-6)}` : undefined);

  // MongoDB Concept: The unique email index will throw code 11000 if duplicate.
  // We don't need to manually check for existing email — let the DB enforce it.
  // The error handler in errorHandler.js catches code 11000 and gives a friendly message.

  const userData = {
    name,
    email, // Schema: lowercase: true — auto-lowercased before save
    passwordHash: password, // Pre-save hook will hash this!
    phone,
    role: role || 'student',
    interests: interests || [],
  };

  // Organizer-specific profile (embedded document)
  if (role === 'organizer') {
    userData.organizerProfile = {
      orgName: orgName || name,
      registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
      verificationStatus: 'verified', // Auto-verify so newly registered organizers can immediately access their dashboard
    };
  }

  // MongoDB Concept: .create() = new Model(data) + .save()
  // The pre-save hook runs, hashing the password before it hits MongoDB
  const user = await User.create(userData);


  // Audit log the registration
  await auditLog({
    actor: user,
    action: 'user.register',
    entity: 'User',
    entityId: user._id,
    meta: { email, role },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendTokenResponse(user, 201, res);
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // MongoDB Concept: .select('+passwordHash') — explicitly include the field
  // that has select:false in the schema (normally excluded for security)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    // Use same message for "user not found" and "wrong password" — security best practice
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated');
  }

  // MongoDB Concept: Instance Method — comparePassword is defined on the schema
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login timestamp
  // MongoDB Concept: Using .save() triggers hooks; using updateOne() bypasses them.
  // Here we use updateOne for a simple field update (no hooks needed)
  await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

  await auditLog({
    actor: user,
    action: 'user.login',
    entity: 'User',
    entityId: user._id,
    meta: { email },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendTokenResponse(user, 200, res);
});

// ── GET ME ────────────────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  // req.user is already populated by the protect middleware
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, interests } = req.body;

  // MongoDB Concept: findByIdAndUpdate with {new:true} returns the UPDATED document
  // Without {new:true}, you'd get the OLD document before the update.
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, phone, interests } },
    { new: true, runValidators: true } // runValidators: re-runs schema validators on update
  );

  await auditLog({
    actor: req.user,
    action: 'user.updateProfile',
    entity: 'User',
    entityId: req.user._id,
    meta: { updatedFields: Object.keys(req.body) },
    ipAddress: req.ip,
  });

  res.json({ success: true, data: user, message: 'Profile updated successfully' });
});

const { sendEmail, emailTemplates } = require('../services/emailService');

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // MongoDB Concept: Setting passwordHash triggers the pre-save hook (re-hashing)
  user.passwordHash = newPassword;
  await user.save(); // Pre-save hook hashes the new password

  await auditLog({
    actor: req.user,
    action: 'user.changePassword',
    entity: 'User',
    entityId: req.user._id,
    ipAddress: req.ip,
    level: 'warning',
  });

  res.json({ success: true, message: 'Password changed successfully' });
});

// ── FORGOT PASSWORD (OTP GENERATION & EMAIL) ──────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a 6-digit OTP code has been sent.',
    });
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.passwordResetOtp = otp;
  user.passwordResetExpires = otpExpires;
  await user.save();

  // Send verification email
  const emailData = emailTemplates.passwordResetOtp({
    name: user.name,
    otp,
  });

  await sendEmail({
    to: user.email,
    subject: emailData.subject,
    html: emailData.html,
  });

  await auditLog({
    actor: user,
    action: 'user.forgotPassword',
    entity: 'User',
    entityId: user._id,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'A 6-digit verification code (OTP) has been sent to your email.',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  });
});

// ── VERIFY OTP ────────────────────────────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw ApiError.badRequest('Email and 6-digit OTP are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    passwordResetOtp: otp.toString().trim(),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetOtp +passwordResetExpires');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification code');
  }

  res.json({
    success: true,
    message: 'Code verified successfully. Please enter your new password.',
  });
});

// ── RESET PASSWORD WITH OTP ───────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }

  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    passwordResetOtp: otp.toString().trim(),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetOtp +passwordResetExpires +passwordHash');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification code');
  }

  // Pre-save hook will hash the new password
  user.passwordHash = newPassword;
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Send confirmation email
  const emailData = emailTemplates.passwordResetSuccess({
    name: user.name,
  });

  await sendEmail({
    to: user.email,
    subject: emailData.subject,
    html: emailData.html,
  });

  await auditLog({
    actor: user,
    action: 'user.resetPassword',
    entity: 'User',
    entityId: user._id,
    ipAddress: req.ip,
    level: 'warning',
  });

  res.json({
    success: true,
    message: 'Your password has been successfully reset! You can now log in.',
  });
});
