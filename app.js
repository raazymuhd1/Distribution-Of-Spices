import express from "express"
import dotenv from 'dotenv';
import cors from "cors"

// rate limiter
import { rateLimit } from 'express-rate-limit'
import { connectDb } from "./helpers/dbConnect.js";
import { distributeRewards } from "./helpers/actions.js";
import { removeLast24Distributions } from "./helpers/cleanup.js"
import { FIFTEEN_MINUTES, TWENTY_FOUR, ONE_HOUR } from "./constants/index.js"

dotenv.config();

const app = express()
const PORT = 4000;

// limit the request  
app.use(rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, 
    message: "limit has reachec"
}))

// db connection
connectDb()


// ----------------------------- ACTIONS -----------------------------------

// REMAININGS FUNCTIONALITIES WILL BE HERE

// will run after each 1 hour
// distributeRewards()
// 1800000 / 30 min
setInterval(() => distributeRewards(), 10000)

// ------------------------- CLEANUP ----------------------------------

// REMOVING LAST 24 HOURS DISTRIBUTIONS
// this can be executed if all of users has been rewarded in 1 day ( in 1 hour each waves )
// setInterval(() => removeLast24Distributions(), 15000)	

 
// app.listen(PORT, () => console.log(`server is running on port ${PORT}`))