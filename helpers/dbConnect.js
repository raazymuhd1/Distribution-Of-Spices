import mongoose from "mongoose"

export const connectDb = async() => {
    const dbURL = process.env.DB_URL;

    try {
        const connection = await mongoose.connect(dbURL, {
            serverSelectionTimeoutMS: 30000
        })
        console.log("db connected")
    } catch(err) {
        console.log(err)
    }
}