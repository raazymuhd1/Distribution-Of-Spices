import { Schema, model } from "mongoose";
// import {UserTestSchema} from "./userTest.model.js"

const SpiceDistributeTestSchema = Schema({
   toAddress: { type: String, required: true, unique: true },
   points: { type: Number, required: true }
}, {
    timestamps: true
})

const SpiceDistributeTest = model("SpiceDistributeTest", SpiceDistributeTestSchema)
export default SpiceDistributeTest;