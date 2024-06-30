import { Schema, model } from "mongoose";

const FailedTxPageSchema = Schema({
    block_number: { type: Number, default: 3232126 },
    index: { type: Number, default: 1 },
    items_count: { type: Number, default: 950 },
    transaction_index: { type: Number, default: 1 },
})

const FailedTxPage = model("FailedTxPage", FailedTxPageSchema)
export default FailedTxPage;
