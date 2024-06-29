import express from "express"
import dotenv from 'dotenv';
import cors from "cors"
import morgan from "morgan";
import { connectDb } from "./helpers/dbConnect.js";
import { distributeRewards } from "./helpers/helpers.js";

// routes
import distributeSpiceRoutes from "./routes/distributeSpice.route.js"

dotenv.config();

const app = express()
const PORT = 4000;

app.use(cors())
app.use(morgan(`combined`))

// db connection
connectDb()

// spice distribution routes
app.use("/api", distributeSpiceRoutes)

distributeRewards()
 
app.listen(PORT, () => console.log(`server is running on port ${PORT}`) )

