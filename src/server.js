require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const startServer = async () => {
  await connectDB();
  
  // Conditionally load scheduler if it exists or stub it
  try {
    const { startScheduler } = require('./jobs/scheduler');
    startScheduler();
  } catch (err) {
    console.warn('Scheduler not found or failed to start:', err.message);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`INSecure server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
