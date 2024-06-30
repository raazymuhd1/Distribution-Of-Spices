import { Schema, model } from "mongoose";

const FailedTxSchema = Schema({
    user: { type: String, default: "" },
    no: { type: Number, default: 0 }
})

const FailedTx = model("FailedTx", FailedTxSchema)
export default FailedTx;
