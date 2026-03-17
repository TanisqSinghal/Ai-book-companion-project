import mongoose from "mongoose";
import { cache } from "react";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/libroAi";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

let cached = global.mongooseCache || (global.mongooseCache = { conn: null, promise: null });

export const connectToDatabase = async () => {
    if(cached.conn) {
        return cached.conn;
    }
    if(!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {bufferCommands: false}).then((mongoose) => {
            return mongoose;
        });
    }
    try{
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }

    console.info("Connected to MongoDB");
    return cached.conn;
}
    