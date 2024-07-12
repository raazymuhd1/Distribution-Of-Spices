import SpiceDistributeTest from "../models/spicesDistributesTest.model.js"

// THIS FUNCTION WILL BE EXECUTED EACH 24 hours, TO REMOVE ALL THE LAST 24 DISTRIBUTIONS DATA.
// START NEW DAY WITH FRESH EMPTY
export const removeLast24Distributions = async() => {
    try {
        const spicesReceivers = await SpiceDistributeTest.find({})

        console.log(spicesReceivers.length)
        if(spicesReceivers.length > 0) {
            await SpiceDistributeTest.deleteMany({ points: { $gte: 0 } });
            console.log(`distributed rewards data has been cleaned up`)
            return;
        }

        console.log(`no distributed rewards being cleaned up`)
    } catch(err) {
        console.log(err)
    }
}