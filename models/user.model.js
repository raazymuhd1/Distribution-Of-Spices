import { Schema, model } from "mongoose";

const UserSchema = Schema({
    user: { type: String, required: [true, "no wallet being saved"], unique: true, default: "" }
}, {
    timestamp: true
})

const User = model("User", UserSchema)
export default User;