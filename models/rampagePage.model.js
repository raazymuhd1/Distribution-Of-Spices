import { Schema, model } from "mongoose";

const RampagePageSchema = Schema({
    block_number: { type: Number, default: 3408380 },
    fee: { type: String, default: "144404969167" },
    hash: { type: String, default: "0x7797a30e67ee726eaa836ed38203e489e9482de8f33673e274780229c6439cd5" },
    inserted_at: { type: String, default: "2024-06-29T16:32:28.174528Z" },
    index: { type: Number, default: 1 },
    items_count: { type: Number, default: 950 },
    value: { type: String, default: "5000000000000" },
})

const RampagePage = model("RampagePage", RampagePageSchema)
export default RampagePage;
