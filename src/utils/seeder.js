const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Startup checks for production:
 * - Drops legacy non-sparse googleId index if present
 * - Never seeds bot/fake users, bot customers, or bot policies
 */
async function seedDatabaseIfEmpty() {
  try {
    // Drop old non-sparse googleId index if it exists in users collection
    try {
      await User.collection.dropIndex('googleId_1');
      console.log('[Seeder] Dropped legacy non-sparse googleId_1 index');
    } catch (e) {}

    // Production mode: No demo/bot data is auto-seeded.
    // Real organizations and users are created strictly on authenticated signups / Google Auth.
  } catch (err) {
    console.error('[Seeder] Startup index check error:', err.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
