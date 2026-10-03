import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DevPilot DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DevPilot DB Error] ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
