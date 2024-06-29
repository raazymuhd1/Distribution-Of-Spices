import express from "express"
import dotenv from 'dotenv';
import cors from "cors"
// request logger
import morgan from "morgan";
// rate limiter
import { rateLimit } from 'express-rate-limit'
import { connectDb } from "./helpers/dbConnect.js";
import { distributeRewards, indexingUser, collectUsers } from "./helpers/helpers.js";
// routes
import distributeSpiceRoutes from "./routes/distributeSpice.route.js"

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

// spice distribution routes
app.use("/api", distributeSpiceRoutes)

setInterval(() => {
    indexingUser()
}, 5000)

// distributeRewards()

// collectUsers()
 
app.listen(PORT, () => console.log(`server is running on port ${PORT}`) )

