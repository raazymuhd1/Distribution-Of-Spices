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

// CHECK PAST DISTRIBUTIONS, TO PREVENT SPICE FROM BEING DOUBLE SPENT
/**
 * - create a distributions collection
 * - save all user that has been receiving spices rewards and an amount they get
 * - check if eligible users has been receiving the rewards today or not, if they do then skip to another eligible users (and so on)
 * - after 24 hours, Clears out all the distributions data for the day
 */
export const checkPastDistributions = async(user) => {
    try {
        const receivers = await SpiceDistributeTest.findOne({toAddress: user});
        if(receivers) return true;
        return false;
    } catch(err) {
        console.log(err)
    }
   
}


export const distributeRewards = async() => {
         try {
            const rewardReceivers = await RewardReceivers.find({});
            const transfersData = rewardReceivers[rewardReceivers.length-1]?.transfers;
            let distributed = false;
            let countPhase = 0;

            for (const user of transfersData) {
                 distributed = await checkPastDistributions(user.toAddress);

                 console.log(`count phase: ${countPhase}`)
                 if(distributed) {
                    console.log("this user has been received rewards", user.toAddress)
                    continue;
                 }
                const data = { transfers: [{ toAddress: user.toAddress, points: user.points }] }
                const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
                        //    spice distribution call
                const res = await fetch(`${goBobInstance}/distribute-points`, {
                             method: "POST",
                             body: JSON.stringify(data),  
                             headers 
                             })

                if(res) {
                    //  saved the new distributions
                    countPhase += 1;
                    saveDistributionsData(user.toAddress, user.points);
                    }

                if(countPhase == transfersData.length) {
                    countPhase = 0
                    console.log("total rewards receiver this phase has been reached")
                    return;
                }

            }

             } catch(err) {
                 console.log(err.message)
             }

}


async function saveDistributionsData(toAddress, points) {
    try {
        const rewardReceiver = await SpiceDistributeTest.findOne({ toAddress })

        if(!rewardReceiver) {
            const newDistribution = new SpiceDistributeTest({ toAddress, points });
            await newDistribution.save();
            console.log("rewards/spices distributed being saved")
            return;
        }

        console.log(`this ${toAddress} has been rewarded`)
    } catch(err) {
        console.log(err)
        return err;
    }
}

