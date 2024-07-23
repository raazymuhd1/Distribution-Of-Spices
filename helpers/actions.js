import { goBobInstance } from "../constants/index.js";
import fetch from "node-fetch"
import EligibleUsers from "../models/eligibleUsers.model.js"
import RewardReceivers from "../models/rewardReceivers.model.js"
import SpiceDistributeTest from "../models/spicesDistributesTest.model.js"
import { getBotSpices, _getTotalPoints, getUserDetails } from "./infos.js"

/**
 * @dev calculating rewards based on points they earned
 */
export const calculateRewards = async(userPoints) => {
     
     try {
         const totalSpices = await getBotSpices();
         const totalPoints = await _getTotalPoints();
         const rewardPercentage = 1; // 1%
         const testAmount = (Number(totalSpices)) / 1000 - 4000// => 10000 test spices amount
    
        // later uncomment this line, after performing spice distributions testing for 10K amounts;
        // const adjustReward = (Number(totalSpices) / Number(totalPoints)) * userPoints;
        // // later comment this line, after performing spice distributions testing for 10K amounts;
        const adjustReward = (testAmount / Number(totalPoints)) * userPoints;
        const totalRewards = (adjustReward * rewardPercentage) / 100 
        const formattedReward = totalRewards.toFixed(8);
        
         return formattedReward;
     } catch(err) {
        console.log(err)
     }
}

/**
/**
 * @dev checking all eligible users points each 15-30 secs, if users points is 0 then removed it from collections
 */
export async function tickingUserRewardsAndPoints() {
    try {
        const usersTest = await EligibleUsers.find({});

        for (const user of usersTest) {
            const { points } = await getUserDetails(user);
            const rewards = await calculateRewards(points);
            
            if(points <= 0) {
                await EligibleUsers.deleteOne({ toAddress: user });
                console.log("this user has been removed, bcoz has 0 points");
                continue;
            }

           const testUser = await EligibleUsers.updateOne({ toAddress: user }, { points: rewards })

        }
    } catch(err) {
        console.log(err)
    }
}



// CHECK PAST DISTRIBUTIONS, TO PREVENT POINTS FROM BEING DOUBLE SPENT
/**
 * - create a distributions collection
 * - save all user that has been receiving spices rewards and an amount they get
 * - check if eligible users has been receiving the rewards today or not, if they do then skip to another eligible users (and so on)
 * - after 24 hours, Clears out all the distributions data for yesterday
 */
// I COULD RUN THIS FUNCTION OUTSIDES of distributesRewards function
// filter out all users that has been rewarded, returning only filter that has been receiving rewards.
// then excluded all of them  
export const checkPastDistributions = async(user) => {
    try {
        const receivers = await RewardReceivers.find({});

        for(const receiver of receivers) {
            const receiverExists = await SpiceDistributeTest.findOne({toAddress: receiver.toAddress});

            if(receiverExists) {
                const removedReceiverRewarded = await RewardReceivers.deleteOne({ toAddress: receiver.toAddress })
                console.log(`total users that has been receiving rewards today and got removed from receiver lists`, removedReceiverRewarded)
                return;
            }

            console.log(`all users are cleans`)
        }
        // if(receivers) return true;
        // return false;
    } catch(err) {
        console.log(err)
    }
   
}

/**
 * @dev this SpiceDistribute collection is meant to save all distributed spices data for eligible users, so later could be use to check past distributions bfore distribute spices to next batch of users
 */
export async function saveDistributionsData(transferData) {
    try {
        if(transferData.length > 0) {
            const insertDistributionsData = await SpiceDistributeTest.insertMany(transferData)
            console.log(`total user has been rewarded ${transferData.length}`)
            console.log(`inserted users ${insertDistributionsData}`)

            const deletedReceivers = await RewardReceivers.deleteMany({ points: { $gte: 0 } })
            console.log(deletedReceivers)
            return
        }

        console.log(`no user gets rewards`)

    } catch(err) {
        console.log(err)
        return err;
    }
}



/**
 * @dev check, calculate and distribute rewards to user that have RP
 */
export const distributeRewards = async() => {
         try {
            const rewardReceivers = await RewardReceivers.find({});
            
            console.log(rewardReceivers.length)
            const data = { transfers: rewardReceivers }
            const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
                    //    spice distribution call
            const res = await fetch(`${goBobInstance}/distribute-points`, {
                         method: "POST",
                         body: JSON.stringify(data),  
                         headers 
                         })
                         console.log(res?.statusText)
                    if(res) {
                        console.log(`rewards distributions status ${res?.status}`)
                        //  saved the new distributions
                        saveDistributionsData(rewardReceivers)
                    }

             } catch(err) {
                 console.log(err.message)
             }

}

