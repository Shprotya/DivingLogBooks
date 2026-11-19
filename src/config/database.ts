import { env } from './env';
import mongoose from 'mongoose';

const uri = env.mongoURI;

export const connectDB = async (): Promise<void> => {
    try {
        // While Vitest is running, use a separate database so tests never touch real data
        const dbName = process.env.VITEST ? 'divelogbook_test' : undefined;

        console.log(`Connecting to MongoDB at ${uri}`);
        const conn = await mongoose.connect(uri, { dbName });
        console.log(`MongoDB Connected (Mongoose): ${conn.connection.host}, database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
        process.exit(1);
    }
};

export const disconnectDB = async (): Promise<void> => {
    await mongoose.disconnect();
}
