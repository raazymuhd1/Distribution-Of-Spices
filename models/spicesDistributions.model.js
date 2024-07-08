import { Schema, model } from "mongoose";

const DistributionSchema = Schema({
    user: { type: String, required: [true, "please insert user wallet that has been rewarded for today"] },
    amountOfReward: { type: Number, required: [true, "provide a reward amounts"], default: 0 },
    // distributedAt: { type: Date, default: new Date() }
}, {
    timestamps: true
})

const SpicesDistribution = model("SpicesDistribution", DistributionSchema)
export default SpicesDistribution;