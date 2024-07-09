import { Schema, model } from "mongoose"
import {EligibleUsersSchema} from "./eligibleUsers.model.js"

const RewardReceiversSchema = Schema({
    transfers: [EligibleUsersSchema]
}, { timestamps: true })

const RewardReceivers = model("RewardReceiver", RewardReceiversSchema)
export default RewardReceivers;