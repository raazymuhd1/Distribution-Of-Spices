import { Schema, model } from "mongoose";

export const UserTestSchema = Schema({
    toAddress: { type: String, required: [true, "no wallet being saved"], unique: true, default: "" },
    points: { type: Number, required: true }
}, {
    timestamps: true
})

const UserTest = model("UserTest", UserTestSchema)
export default UserTest;