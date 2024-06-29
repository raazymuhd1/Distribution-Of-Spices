import { Schema, model } from "mongoose";

const PageSchema = Schema({
    block_number: { type: Number, default: 3232126 },
    index: { type: Number, default: 1 },
    items_count: { type: Number, default: 950 },
    transaction_index: { type: Number, default: 1 },
})

const Page = model("Page", PageSchema)
export default Page;
