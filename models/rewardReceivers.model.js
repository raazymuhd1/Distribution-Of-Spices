import { Schema, model } from "mongoose"
import {UserTestSchema} from "./userTest.model.js"

const RewardReceiversSchema = Schema({
    transfers: [UserTestSchema]
}, { timestamps: true })

const RewardReceivers = model("RewardReceiver", RewardReceiversSchema)
export default RewardReceivers;