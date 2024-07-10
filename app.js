import express from "express"
import dotenv from 'dotenv';
import cors from "cors"
// request logger
// import morgan from "morgan";
// rate limiter
import { rateLimit } from 'express-rate-limit'
import { connectDb } from "./helpers/dbConnect.js";
// import { distributeRewards, indexingUser, removeLast24Distributions, removingPages,removingSkippingAddresses } from "./helpers/helpers.js";
import { distributeRewards, tickingUserRewardsAndPoints, userRewardsPerWaves } from "./helpers/actions.js";
import { removingPages, removingSkippingAddresses, removeLast24Distributions } from "./helpers/cleanup.js"
import { indexingUser } from "./helpers/indexingUsers.js"
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
// app.use(cors())
// app.use(morgan(`combined`))

// db connection
connectDb()


// ----------------------------- ACTIONS -----------------------------------
// indexing new users on each 5-10mins, to avoid request limit (from BOB server). on production
// u can adjusted according to how fast account creation txs happens each 1-5 minutes
// setInterval(() =>  indexingUser(), 15000)

// ticking eligilbe users rewards
// run this on each 20-30 min bfore each phase
// setInterval(() =>  tickingUserRewardsAndPoints(), 15000)

// saving user rewards per wave
// run this function on each 45 min bfore each phase 1200000
// setInterval(() => userRewardsPerWaves(), 10000);

// will run after each 1 hour
// distributeRewards()
// 1800000 / 30 min
// setInterval(() => distributeRewards(), 1800000) // 60 min

// ------------------------- REMOVAL ----------------------------------

// removing pages each 5 secs
// this function duration should be less than indexingUser() function below
// setInterval(() => removingPages(), 5000)

// setInterval(() => {
// 	removingSkippingAddresses()
// }, TWENTY_FOUR + 15000)

// REMOVING LAST 24 HOURS DISTRIBUTIONS
// this can be executed if all of users has been rewarded in 1 day ( in 1 hour each waves )
// setInterval(() => removeLast24Distributions(), FIFTEEN_MINUTES)	
 
app.listen(PORT, () => console.log(`server is running on port ${PORT}`))

