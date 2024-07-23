import express from "express"
import dotenv from 'dotenv';
import cors from "cors"

// rate limiter
import { rateLimit } from 'express-rate-limit'
import { connectDb } from "./helpers/dbConnect.js";
import { distributeRewards, tickingUserRewardsAndPoints, checkPastDistributions } from "./helpers/actions.js";
import { getBotSpices, checkingUserSpices, _getTotalPoints, _getTotalUsers } from "./helpers/infos.js";
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
/**
 * @dev runs on each 15 mins to check and update user points, if user points is became zero then remove that user from EligibleUsers collections
 */
setInterval(() => tickingUserRewardsAndPoints(), FIFTEEN_MINUTES)

/**
 * @notice this will check user past distributions, to prevent from being double spent
 * @notice always runs 5-10 mins bfore distribute rewards function
 * @notice I set 20 mins for testing
 */
setInterval(() => checkPastDistributions(), 1200000)

/**
 * @notice this will executed on each 30 mins (change to 60 mins later in MS)
 */
setInterval(() => distributeRewards(), 1800000)

// this project total spices
getBotSpices()
_getTotalPoints()
_getTotalUsers();

// use this function to check user spices
// setInterval(() => checkingUserSpices(), 21000)

// ------------------------- CLEANUP ----------------------------------

// REMOVING LAST 24 HOURS DISTRIBUTIONS
// this can be executed if all of users has been rewarded in 1 day ( in 1 hour each waves )
// setInterval(() => removeLast24Distributions(), 5000)	

 
app.listen(PORT, () => console.log(`server is running on port ${PORT}`))