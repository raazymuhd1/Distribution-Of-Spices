import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import fs from "fs"
import fetch from "node-fetch"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Page from "../models/pageData.model.js";
import Skip from "../models/skip.model.js"
import UserTest from "../models/userTest.model.js"
import RewardReceivers from "../models/rewardReceivers.model.js"
import SpiceDistributeTest from "../models/spicesDistributesTest.model.js"

/**
 * @dev get contract
 * @returns eventCa - contract
 */
const getContract = async() => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(process.env.BOB_RPC_MAINNET)
        const eventCa = new ethers.Contract(eventContract, EventCoreAbi.abi, provider);
        return eventCa;
    } catch(err) {
        console.log(err)
    }
}

const getUserDetails = async(user) => {
    const contract = await getContract()
    const userDetails = await contract.getUser(user)
    const userPoints = userDetails["points"].toString()
    // if returns true, means user has been registred on rampage
    const isRampageRegistered = userDetails["accountInitialized"];

    return {
        points: userPoints,
        rampageRegistered: isRampageRegistered
    };
}


const _getTotalPoints = async() => {
    const contract = await getContract()
    const totalPoints = await contract.getTotalPoints();
     
    return totalPoints
}


export async function _getTotalUsers() {
     const contract = await getContract()
    const totalUsers = await contract.getTotalUsers();
    return totalUsers - 1;
}

// GET PROJECT TOTAL SPICES
const getBotSpices = async() => {
    const { data } = await axios.get(`${goBobInstance}/partners`)
    const filteredResults = data?.partners.filter(partner => partner.name == "BOTS OF BITCOIN ")
    const totalSpices = filteredResults[0]?.total_points;

     return totalSpices;
}

// check is user has been registered on fusion or not
const isFusionRegistered = async(userWallet) => {
    try{
        const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
        const isUserExists = data?.ok;
        if(!isUserExists) {
            await User.deleteOne({ user: userWallet })
            console.log("deleted")
            return false;
        }
    
        return isUserExists;
    } catch(err) {
        console.log(err)
        return err
    }
}

// const getTotalRampageMembers = async() => {
//     try {
//         const users = await User.find({})
//         return users;
//     } catch(err) {
//         console.log(err)
//     }
// }

const totalUserIsEqual = async() => {
    try {
        const totalRampageUsers = await UserTest.find({})
        const rewardsDistributed = await SpicesDistribution.find({});
        const isEqual = rewardsDistributed.length === totalRampageUsers.length;
       
        return isEqual;
    } catch(err) {
        console.log(err)
    }
}

export const removingPages = async() => {
     try {
         const isEqual = await totalUserIsEqual();
         if(isEqual) {
           const pagesDeleted = await Page.deleteMany({ block_number: { $gte: 0 } });
           console.log(pagesDeleted);
           return;
         }

         console.log("no pages being removed")
     }catch(err) {
        console.log(err)
     }
}

export const removingSkippingAddresses = async() => {
    try{
        const rampageUsers = await getTotalRampageMembers();
        const rewardsReceivers = await SpiceDistribution.find({})
        const receiversLength = rampageUsers.length == rewardsReceivers.length

        // if(receiversLength) {
            await Skip.deleteMany({ skipValue: { $gte: 0 } })
        // }
    } catch (err) {

    }
}


const calculateRewards = async(userPoints) => {
     
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
        const usersTest = await UserTest.find({});

        for (const user of usersTest) {
            const { points } = await getUserDetails(user);
            const rewards = await calculateRewards(points);
            
            if(points <= 0) {
                await UserTest.deleteOne({ toAddress: user });
                console.log("this user has been removed, bcoz has 0 points");
                continue;
            }

           const testUser = await UserTest.updateOne({ toAddress: user }, { points: rewards })

        }
    } catch(err) {
        console.log(err)
    }
}

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only a success account creation txs
 */
const getInternalTxs = async() => {
    try {
        // const isUsersEqual = await usersIsEqual();
        const pages = await Page.find({})
        const page = pages[pages.length-1]
        let url = ''

        // TODO
        // creating a new collections to collects all users, without checking rampage or fusion membership ( this collection will be use to determined a dinamic new users data fetching)
        // creating a collections to collects only users who has been registered on rampage & fusions

        if(pages.length > 0) {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`
        } else {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
        }

        const {data} = await axios.get(url)
        const accountCreationTxs = data["items"].filter(item => item.type == "call" && item?.success == true)
        

        if(data?.next_page_params) {
            const { block_number, index, items_count, transaction_index } = data?.next_page_params
            const newPage = new Page({ block_number, index, items_count, transaction_index })
            await newPage.save()
        }

        console.log(data?.next_page_params)
        return accountCreationTxs;
    } catch(err) {
        console.log(err)
        return err
    }

}

/**
 * @dev indexing registered users
 * @param {*} user 
 */
export const userIndexed_ = async(user) => {
    try {
        const isUserAlreadyExists = await UserTest.findOne({ toAddress: user })
        const { points, rampageRegistered } = await getUserDetails(user);
        const rewards = await calculateRewards(points);
        const isFusionMember = await isFusionRegistered(user);
        //  check if the address is valid
         if(user == "") {
            throw new Error("txs user address cannot be zero")
            return;
         }
    
        //  check whether the wallet already exist or not in the wallet storage
         if(isUserAlreadyExists) {
            console.log("user has been indexed")
            return;
         }
    
         if(!rampageRegistered || !isFusionMember) {
             console.log("not eligible for rewards receiver")
         }

         const rampageUsers = new UserTest({ toAddress: user, points: rewards }) 
         await rampageUsers.save()
        
    } catch (error) {
        console.log(error)
    }
  
}

async function checkingAccountCreationTxs(tx) {
     const url = `${explorerBob}/transactions/${tx?.transaction_hash}`
     const res = await fetch(url)
     const data = await res.json();
     let user = ""
            
    if(data?.method == "createAccount" || data?.method == "dailyLogin" && data?.status == "ok") {
        user = data?.from?.hash
        return user;
     }
    
    console.log("not account creation tx")
}

// 
export const indexingUser = async() => {
    try {
        const internalTxs = await getInternalTxs()
        let user = ""
    
        for (const tx of internalTxs) {
            const userAddr = await checkingAccountCreationTxs(tx)
            const { points } = await getUserDetails(userAddr);

            if(points <= 0) continue;
            userIndexed_(userAddr);
        }

    } catch(err) {
        console.log(err)
    }

}


// THIS FUNCTION WILL BE EXECUTED EACH 24 hours, TO REMOVE ALL THE LAST 24 DISTRIBUTIONS DATA.
export const removeLast24Distributions = async() => {
    try {
        const spicesReceivers = await SpicesDistribution.find({})
        if(spicesReceivers.length > 0) {
            await SpicesDistribution.deleteMany({ amountOfReward: { $gte: 0 } });
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
        const receivers = await SpicesDistribution.find({user});
        const receiverExists = receivers.map(rec => rec.user);
        console.log(receiverExists.includes(user))
        if(receiverExists.includes(user)) return true;
        return false;
    } catch(err) {
        console.log(err)
    }
   
}


export const userRewardsPerWaves = async() => {
    try {
        const totalUsers = await UserTest.find({});
        const usersPerRound = Number(totalUsers.length / 24).toFixed(0);
        let limit = Number(usersPerRound);
        let skip = 0;
        const skipItems = await Skip.find({})
        let skipTo = skipItems.length > 0 ? skipItems[skipItems.length-1].skipValue : skip ;
        const registeredUsers = await UserTest.find({}).skip(skipTo).limit(limit)

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
export const distributeRewards = async() => {
         try {
            const rewardReceivers = await RewardReceivers.find({});
            const transfersData = rewardReceivers[0]?.transfers;
            
            console.log(transfersData.length)
            const data = { transfers: transfersData }
            const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
                    //    spice distribution call
            const res = await fetch(`${goBobInstance}/distribute-points`, {
                         method: "POST",
                         body: JSON.stringify(data),  
                         headers 
                         })

                    // if(res) {
                        //  saved the new distributions
                        saveDistributionsData(transfersData)
                        await RewardReceivers.deleteMany({ transfers: [{ points: { $gte: 0} }] })
                    // }

             } catch(err) {
                 console.log(err.message)
                //  process.report.writeReport(err)
             }

}




async function saveDistributionsData(transferData) {
    try {
        if(transferData.length > 0) {
            const newDistribution = new SpiceDistributeTest({ transfers: transferData });
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