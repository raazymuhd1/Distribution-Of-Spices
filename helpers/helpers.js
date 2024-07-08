import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import fs from "fs"
import fetch from "node-fetch"
import User from "../models/user.model.js"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Page from "../models/pageData.model.js";
import Skip from "../models/skip.model.js"

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

const getTotalRampageMembers = async() => {
    try {
        const users = await User.find({})
        return users;
    } catch(err) {
        console.log(err)
    }
}

const usersIsEqual = async() => {
    try {
        const totalUsers = await _getTotalUsers()
        const rampageUsers = await getTotalRampageMembers();
        const isUsersEqual = Number(totalUsers) === rampageUsers.length;
       
        return isUsersEqual;
    } catch(err) {
        console.log(err)
    }
}

export const removingPages = async() => {
     try {
         const isUsersEqual = await usersIsEqual();
         if(isUsersEqual) {
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

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only a success account creation txs
 */
const getInternalTxs = async() => {
    try {
        const isUsersEqual = await usersIsEqual();
        const pages = await Page.find({})
        const page = pages[pages.length-1]
        let url = ''

        if(pages.length > 0 && !isUsersEqual) {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`
        } else {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
        }

        const {data} = await axios.get(url)
        const accountCreationTxs = data["items"].filter(item => item.type == "call" && item?.success == true)
        let isUserExist = false;
        
        // for (const tx of accountCreationTxs) {
        //      const userAddr = await checkingAccountCreationTxs(tx);
        //      const matchesUser = await User.find({ user: userAddr }) 
        //      const userMatched = matchesUser[0];
             
        //      if(userMatched.user == userAddr) {
        //         isUserExist = true;
        //     }
            
        // }

        if(data?.next_page_params && !isUsersEqual) {
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
        const isUserAlreadyExists = await User.findOne({ user })
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
    
         const rampageUsers = new User({ user }) 
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
    
        internalTxs.map(async(tx) => {
            const userAddr = await checkingAccountCreationTxs(tx)
            userIndexed_(userAddr);
        })

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

// const distributionsData = [
//     { user: "0x1FA4D89f1d044dCa763610F30E51AAda92C6c38c", amountOfReward: 100 },
//     { user: "0xea4Ee82611Fdaf79bf9FA11cC62Bd59597FcfD5b", amountOfReward: 100 },
//     { user: "0x187a854D82A838156D45763BCb4941d9612c842D", amountOfReward: 100 },
//     { user: "0xD18F8F016d85567cD088b40Bd9E3b3839b95DDB2", amountOfReward: 100 },
// ]

// export async function testAddDistributions() {
//     for(const data of distributionsData) {
//         const distributions = new SpicesDistribution({ user: data.user, amountOfReward: data.amountOfReward })
//         await distributions.save()
//     }
// }

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

/**
 * @dev check, calculate and distribute rewards to user that have RP
 */
export const distributeRewards = async() => {
    const totalUsers = await _getTotalUsers();
    const usersPerRound = Math.ceil(Number(totalUsers) / 24);
    let limit = usersPerRound;
    let skip = 0;
    let distributed = false;
    // if users has been rewarded, then skip to the next 339 users ( skip )
    // const randomSkip = Math.ceil(Math.random() * totalUsers);
    const skipItems = await Skip.find({})
    let skipTo = skipItems.length > 0 ? skipItems[skipItems.length-1].skipValue : skip ;
    const registeredUsers = await User.find({}).skip(skipTo).limit(limit)
    const totalDistributeds = await SpicesDistribution.find({});
    let totalRewardedPerRound = []

    console.log(`"skip to ${skipTo}`)

    for(const user of registeredUsers) {

         try {
                distributed = await checkPastDistributions(user.user)
                const fusionRegistered = await isFusionRegistered(user.user);
                const { points, rampageRegistered } = await getUserDetails(user.user);
                const userRewards = await calculateRewards(points)

                console.log(totalRewardedPerRound.length)

                 //  if totalRewarded has been == usersPerRound, then stop.
                if(totalDistributeds.length >= skipTo) {
                    skipTo += usersPerRound;
                    console.log("skip to",skipTo)
                    console.log("total reward receivers per round has been reached", totalRewardedPerRound.length) 
                    totalRewardedPerRound = [];

                    const skipData = new Skip({ skipValue: skipTo })
                    await skipData.save();
                    return;
                }

                if (distributed) {
                    console.log(`User ${user.user} already received rewards, skipping...`);
                    continue; // Skip to the next user in the list (continue to the next iterations)
                }
     
                if(points > 0 && fusionRegistered && rampageRegistered) {
                      const data = { transfers: [ 
                        { toAddress: `${user.user}`, points: userRewards } 
                        ] }
                       const headers = { 'x-api-key': process.env.BOB_API_KEY, 'Content-Type': 'application/json' }
                     
                    //    spice distribution call
                      const res = await fetch(`${goBobInstance}/distribute-points`, {
                         method: "POST",
                         body: JSON.stringify(data),  
                         headers 
                        })

                    // if(res) {
                        totalRewardedPerRound.push(user.user)
                        //  saved the new distributions
                        saveDistributionsData(user.user, userRewards)
                    // }
                  }

             } catch(err) {
                 console.log(err.message)
                //  process.report.writeReport(err)
             }
    }

}


async function saveDistributionsData(user, points) {
    try {
        const receiverExists = await SpicesDistribution.find({user});
        const rewardsReceiver = receiverExists.map(rec => rec.user);

        if(rewardsReceiver.includes(user)) return;
        const newDistribution = new SpicesDistribution({ user, amountOfReward: points });
        await newDistribution.save();
    } catch(err) {
        console.log(err)
        return err;
    }
}