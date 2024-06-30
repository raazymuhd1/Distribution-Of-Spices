import { Schema, model } from "mongoose";

const RampageSchema = Schema({
    user: { type: String, required: [true, "no wallet being saved"], unique: true, default: "" },
    rampageUser: Boolean
}, {
    timestamp: true
})

const RampageUser = model("RampageUser", RampageSchema)
export default RampageUser;