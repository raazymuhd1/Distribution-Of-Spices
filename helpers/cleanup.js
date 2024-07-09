import { getTotalUsersFromDb } from "./infos.js"
import Page from "../models/pageData.model.js";
import SpiceDistributeTest from "../models/spicesDistributesTest.model.js"

// THIS FUNCTION WILL BE EXECUTED EACH 24 hours, TO REMOVE ALL THE LAST 24 DISTRIBUTIONS DATA.
export const removeLast24Distributions = async() => {
    try {
        const spicesReceivers = await SpiceDistributeTest.find({})
        if(spicesReceivers.length > 0) {
            await SpiceDistributeTest.deleteMany({ points: { $gte: 0 } });
        }
    } catch(err) {
        console.log(err)
    }
}


export const removingPages = async() => {
     try {
        //  const isEqual = await totalUserIsEqual();
        //  if(isEqual) {
           const pagesDeleted = await Page.deleteMany({ block_number: { $gte: 0 } });
           console.log(pagesDeleted);
           return;
        //  }

         console.log("no pages being removed")
     }catch(err) {
        console.log(err)
     }
}

export const removingSkippingAddresses = async() => {
    try{
        const rampageUsers = await getTotalUsersFromDb();
        const rewardsReceivers = await SpiceDistribution.find({})
        const receiversLength = rampageUsers.length == rewardsReceivers.length

        // if(receiversLength) {
            await Skip.deleteMany({ skipValue: { $gte: 0 } })
        // }
    } catch (err) {

    }
}