import { Schema, model } from "mongoose"

const SkipSchema = Schema({
    skipValue: { type: Number, default: 0, unique: true, required: true }
})

const Skip = model("Skip", SkipSchema);
export default Skip;