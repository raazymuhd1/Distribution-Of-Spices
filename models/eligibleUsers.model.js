import { Schema, model } from "mongoose";

export const EligibleUsersSchema = Schema({
    toAddress: { type: String, required: [true, "no wallet being saved"], unique: true, default: "" },
    points: { type: Number, required: true }
}, {
    timestamps: true
})

const EligibleUsers = model("EligibleUsers", EligibleUsersSchema)
export default EligibleUsers;