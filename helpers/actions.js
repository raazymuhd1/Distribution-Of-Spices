import { goBobInstance } from "../constants/index.js";
import fetch from "node-fetch"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Skip from "../models/skip.model.js"
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
export const checkPastDistributions = async(user) => {
    try {
        const receivers = await SpiceDistributeTest.findOne({toAddress: user});
        if(receivers) return true;
        return false;
    } catch(err) {
        console.log(err)
    }
   
}


/**
 * @dev adds all eligible users for receiving rewards to rewardsReceiver collections
 * 
 */
export const userRewardsPerWaves = async() => {
    try {
        const totalUsers = await EligibleUsers.find({});
        const usersPerRound = Number(totalUsers.length / 24).toFixed(0);
        let limit = Number(usersPerRound);
        let skip = 0;
        const skipItems = await Skip.find({})
        let skipTo = skipItems.length > 0 ? skipItems[skipItems.length-1].skipValue : skip ;
        const registeredUsers = await EligibleUsers.find({}).skip(skipTo).limit(limit)

        console.log(skipTo) // 0xBc4bB0072d6004908D8A0790eeFfBb35A7b4D9eC
        console.log(registeredUsers[0].toAddress) // 0xBc4bB0072d6004908D8A0790eeFfBb35A7b4D9eC

        if(registeredUsers.length == Number(usersPerRound)) {
            // I COULD CHECK HERE ON SpiceDistributeTest collections, IF USER HAS BEEN REWARDED/EXIST THEN EXCLUDED/ Dont include in rewards receivers
            const rewardsReceivers = new RewardReceivers({ transfers: registeredUsers })
            await rewardsReceivers.save()
            console.log("rewards receiver has been added")
            skipTo += Number(usersPerRound) + 2; // + 2 bcoz a collections starts at index zero, if length 100 last item will be at index 101

            const addedSkipStep = new Skip({skipValue: skipTo})
            await addedSkipStep.save()
            console.log("skipStep added")
            return;
        }

        console.log("lengths is not equal")

    } catch(err) {
        console.log(err)
    }
}


export const distributeRewards = async() => {
         try {
            // I could get the last index/items on this collections
            const rewardReceivers = await RewardReceivers.find({});
            const transfersData = rewardReceivers[0]?.transfers;
            let distributed = false;
            let countPhase = 0;
            let totalDistributed = 0;

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

                // if(res) {
                    //  saved the new distributions
                    countPhase += 1;
                    totalDistributed += 1;
                    saveDistributionsData(user.toAddress, user.points);
                    console.log(`count phase: ${countPhase}`)
                    // }

                if(countPhase == transfersData.length) {
                    count = 0
                    console.log("total rewards receiver this phase has been reached")
                    const updated = await RewardReceivers.deleteOne({ _id: rewardReceivers[0]._id })
                    console.log(updated);
                    return;
                }

            }

             } catch(err) {
                 console.log(err.message)
             }

}


async function saveDistributionsData(toAddress, points) {
    try {
        const rewardReceiver = await SpiceDistributeTest.find({ toAddress })
        const isExist = rewardReceiver.map(user => user.toAddress)

        console.log(!isExist.includes(toAddress))
        if(rewardReceiver && rewardReceiver.length == 0) {
            const newDistribution = new SpiceDistributeTest({ toAddress, points });
            await newDistribution.save();
            console.log("rewards/spices distributed being saved")
            return;
        }

        console.log("rewards/spices distributed is not being saved")
    } catch(err) {
        console.log(err)
        return err;
    }
}


/**
 * @dev check, calculate and distribute rewards to user that have RP
 */
// export const distributeRewards = async() => {
//          try {
//             const rewardReceivers = await RewardReceivers.find({});
//             const transfersData = rewardReceivers[0]?.transfers;
            
//             console.log(transfersData.length)
//             const data = { transfers: transfersData }
//             const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
//                     //    spice distribution call
//             const res = await fetch(`${goBobInstance}/distribute-points`, {
//                          method: "POST",
//                          body: JSON.stringify(data),  
//                          headers 
//                          })

//                     // if(res) {
//                         //  saved the new distributions
//                         saveDistributionsData(transfersData)
//                         await RewardReceivers.deleteMany({ transfers: [{ points: { $gte: 0} }] })
//                     // }

//              } catch(err) {
//                  console.log(err.message)
//                 //  process.report.writeReport(err)
//              }

// }

// async function saveDistributionsData(toAddress, points) {
//     try {
//         const rewardReceiver = await SpiceDistributeTest.find({ toAddress })
//         const isExist = rewardReceiver.map(user => user.toAddress)

//         if(transferData.length > 0) {
//             const newDistribution = new SpiceDistributeTest({ toAddress, points });
//             await newDistribution.save();
//             console.log("rewards/spices distributed being saved")
//             return;
//         }

//         console.log("rewards/spices distributed is not being saved")
//     } catch(err) {
//         console.log(err)
//         return err;
//     }
// }