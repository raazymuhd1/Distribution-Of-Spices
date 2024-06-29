import mongoose from "mongoose"

export const connectDb = async() => {
    const dbURL = process.env.DB_URL;

    try {
        await mongoose.connect(dbURL)
        console.log("db connected")
    } catch(err) {
        console.log(err)
    }
}