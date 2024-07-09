import { Schema, model } from "mongoose";
import {UserTestSchema} from "./userTest.model.js"

const SpiceDistributeTestSchema = Schema({
   transfers: [UserTestSchema]
}, {
    timestamps: true
})

const SpiceDistributeTest = model("SpiceDistributeTest", SpiceDistributeTestSchema)
export default SpiceDistributeTest;