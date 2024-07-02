import express from "express"
import dotenv from 'dotenv';
import cors from "cors"
// request logger
import morgan from "morgan";
// rate limiter
import { rateLimit } from 'express-rate-limit'
import { connectDb } from "./helpers/dbConnect.js";
import { distributeRewards, indexingUser, _getTotalUsers, removeLast24Distributions, testAddDistributions } from "./helpers/helpers.js";
import { indexingRampage, getInternalRampageUsers } from "./helpers/testTxs.js"
// routes
import distributeSpiceRoutes from "./routes/distributeSpice.route.js"
import { handleKeyEncryption } from "./keyEncryption.js"

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
app.use(cors())
app.use(morgan(`combined`))

// db connection
connectDb()

// testAddDistributions()

setInterval(() => {
    indexingUser()
}, 5000)

// will run after each 1 hour
// setInterval(() => {
	// distributeRewards()
// }, 5000)
// 3600000

// REMOVING LAST 6 HOURS DISTRIBUTIONS
setInterval(() => {
	removeLast24Distributions()
}, 21600000)	
 
app.listen(PORT, () => console.log(`server is running on port ${PORT}`) )



