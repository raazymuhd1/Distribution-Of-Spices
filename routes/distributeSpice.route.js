import express from "express"
import { userRegistered } from "../controllers/distributeSpice.controller.js";

const router = express.Router()

router.post("/registeredUser", userRegistered);


export default router;