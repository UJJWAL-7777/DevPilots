import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import buildQueue from './services/buildQueue.js';

// Connect to MongoDB and recover build queue state
const startServer = async () => {
  await connectDB();
  await buildQueue.recoverOnStartup();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[DevPilot Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
