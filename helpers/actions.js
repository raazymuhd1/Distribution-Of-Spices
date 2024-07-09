import { goBobInstance } from "../constants/index.js";
import fetch from "node-fetch"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Skip from "../models/skip.model.js"
import EligibleUsers from "../models/eligibleUsers.model.js"
import RewardReceivers from "../models/rewardReceivers.model.js"
import SpiceDistributeTest from "../models/spicesDistributesTest.model.js"
import { getBotSpices, _getTotalPoints, getUserDetails } from "./infos.js"


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
        const receivers = await SpiceDistributeTest.find({toAddress: user});
        const receiverExists = receivers.map(rec => rec.toAddress);
        console.log(receiverExists.includes(user))
        if(receiverExists.includes(user)) return true;
        return false;
    } catch(err) {
        console.log(err)
    }
   
}


export const userRewardsPerWaves = async() => {
    try {
        const totalUsers = await EligibleUsers.find({});
        const usersPerRound = Number(totalUsers.length / 24).toFixed(0);
        let limit = Number(usersPerRound);
        let skip = 0;
        const skipItems = await Skip.find({})
        let skipTo = skipItems.length > 0 ? skipItems[skipItems.length-1].skipValue : skip ;
        const registeredUsers = await EligibleUsers.find({}).skip(skipTo).limit(limit)

        console.log(registeredUsers.length, Number(usersPerRound))

        if(registeredUsers.length == Number(usersPerRound)) {
            const rewardsReceivers = new RewardReceivers({ transfers: registeredUsers })
            await rewardsReceivers.save()
            console.log("rewards receiver has been added")
            skipTo += Number(usersPerRound);

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

export const distributeRewards = async() => {
         try {
            const rewardReceivers = await RewardReceivers.find({});
            const transfersData = rewardReceivers[0]?.transfers;
            let distributed = false;
            
            for (const user of transfersData) {
                 distributed = await checkPastDistributions(user.toAddress);
                 if(distributed) {
                    console.log("this user has been received rewards", user)
                    continue;
                 }
                const data = { transfers: [
                    { toAddress: user.toAddress, points: user.points }
                ] }
                const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
                        //    spice distribution call
                const res = await fetch(`${goBobInstance}/distribute-points`, {
                             method: "POST",
                             body: JSON.stringify(data),  
                             headers 
                             })
                // if(res) {
                    //  saved the new distributions
                    saveDistributionsData(user.toAddress, user.points);
                // await RewardReceivers.deleteMany({ transfers: [{ points: { $gte: 0} }] })
                // }

            }


             } catch(err) {
                 console.log(err.message)
                //  process.report.writeReport(err)
             }

}




async function saveDistributionsData(toAddress, points) {
    try {
        const rewardReceiver = await SpiceDistributeTest.find({ toAddress })
        const isExist = rewardReceiver.map(user => user.toAddress)

        console.log(!isExist.includes(toAddress))
        if(!isExist.includes(toAddress)) {
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