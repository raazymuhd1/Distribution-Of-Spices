import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import fetch from "node-fetch"
import User from "../models/user.model.js"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Page from "../models/pageData.model.js";

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

export const getRampageTotalUses = async() => {
    try {
        const users = await User.find({})
        console.log(users.length)
    } catch(err) {
        console.log(err)
    }
}

// GET ALL RAMPAGE USERS AND INDEX IT
// const indexingAllRampageUsers = async() => {
//     const rampageData = await RampageNext.find({})
//     const rampagePage = rampageData[rampageData.length-1]
//     let rampageUsers = []

//     console.log(rampageData.length)

//     // 
//     // if(rampagePage && "block_number" in rampagePage) {
//         const url = `https://explorer.gobob.xyz/api/v2/addresses/${rampageV1}/internal-transactions?filter=to%20%7C%20from&block_number=2943155&index=2&items_count=5050&transaction_index=1`
    
//         const { data } = await axios.get(url)
//         rampageUsers = data["items"].filter(item => item?.type == "call")
    
//         console.log(data)
    
//         // const { block_number, index, items_count, transaction_index } = data?.next_page_params
    
//         // if(block_number && index && items_count && transaction_index) {
//         //     const nextPage = new RampageNext({ block_number, index, items_count, transaction_index })
//         //     await nextPage.save()
//         // }

//     // }

//     return rampageUsers;
// }


const pages = [
    {
        block_number: 3232126,
        index: 1,
        items_count: 950,
        transaction_index: 1,
    }
]

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only a success account creation txs
 */
const getInternalTxs = async() => {
    try {
        const pages = await Page.find({})
        const page = pages[pages.length-1]
        let url = ''

        if(pages.length > 0) {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`
        } else {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
        }

        const {data} = await axios.get(url)
        const onlyCall = data["items"].filter(item => item.type == "call" && item?.success == true)
        const { block_number, index, items_count, transaction_index } = data?.next_page_params
      
        // uncomment this line, if u want to navigate to the next page & save to pages collections
        // if(block_number && index && items_count && transaction_index) {
        //     const newPage = new Page({ block_number, index, items_count, transaction_index })
        //     await newPage.save()
        // }

        console.log(data?.next_page_params)
        return onlyCall;
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

// 
export const indexingUser = async() => {
    try {
        const internalTxs = await getInternalTxs()
        let user = ""
    
        internalTxs.map(async(tx) => {
            const url = `${explorerBob}/transactions/${tx?.transaction_hash}`
            const { data } = await axios.get(url)
            
            if(data?.method == "createAccount" || data?.method == "dailyLogin" && data?.status == "ok") {
                user = data?.from?.hash
                userIndexed_(user)
                return;
            }
    
            console.log("not account creation tx")
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


export const _getTotalUsers = async() => {
     const contract = await getContract()
    const totalUsers = await contract.getTotalUsers();
    return totalUsers
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
        console.log(last24DistributionsRemoved)
    }
}

const distributionsData = [
    { user: "0x1FA4D89f1d044dCa763610F30E51AAda92C6c38c", amountOfReward: 100 },
    { user: "0xea4Ee82611Fdaf79bf9FA11cC62Bd59597FcfD5b", amountOfReward: 100 },
    { user: "0x187a854D82A838156D45763BCb4941d9612c842D", amountOfReward: 100 },
    { user: "0xD18F8F016d85567cD088b40Bd9E3b3839b95DDB2", amountOfReward: 100 },
]

export async function testAddDistributions() {
    for(const data of distributionsData) {
        const distributions = new SpicesDistribution({ user: data.user, amountOfReward: data.amountOfReward })
        await distributions.save()
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
    // const { data } = await axios.get(`${goBobInstance}/past-distributions?page=1&limit=500`)

    try {
        // const distributes = await SpicesDistribution.find({});
        // const distributedData = distributes.map(distri => distri.user)
        // if(distributedData.includes(user)) return true;
        const receiverExists = await SpicesDistribution.find({user});
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
         const testAmount = (Number(totalSpices) / 1000) - 400// => 14838.760384185
    
        // const adjustReward = (Number(totalSpices) / Number(totalPoints)) * userPoints;
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
    const usersPerRound = Math.ceil(totalUsers / 24);
    let limit = 1000;
    let skip = 0;
    let distributed = false;
    // if users has been rewarded, then skip to the next 339 users ( skip )
    const randomSkip = Math.ceil(Math.random() * totalUsers);
    const registeredUsers = await User.find({}).skip(skip).limit(limit)
    let totalRewardedPerRound = []

    for(const user of registeredUsers) {
        console.log(totalRewardedPerRound.length)
         try {
                distributed = await checkPastDistributions(user.user)
                const fusionRegistered = await isFusionRegistered(user.user);
                const { points, rampageRegistered } = await getUserDetails(user.user);
                const userRewards = await calculateRewards(points)

                 //  if totalRewarded has been == usersPerRound, then stop.
                if(totalRewardedPerRound.length >= 5) {
                    console.log("total reward receivers per round has been reached", totalRewardedPerRound.length) 
                    totalRewardedPerRound = [];
                    skip += usersPerRound;
                    break;
                }

                if (distributed) {
                    console.log(`User ${user.user} already received rewards, skipping...`);
                    continue; // Skip to the next user in the list (continue to the next iterations)
                }
     
                if(points > 0 && fusionRegistered && rampageRegistered) {
                      const data = { transfers: [ 
                        { toAddress: `${user.user}`, points: userRewards } 
                        ] }
                       const headers = { 'x-api-key': "", 'Content-Type': 'application/json' }
                     
                    //    spice distribution call
                      const res = await fetch(`${goBobInstance}/distribute-points`, {
                         method: "POST",
                         body: JSON.stringify(data),  
                         headers 
                        })

                       totalRewardedPerRound.push(user.user)
                       console.log(res.statusText)

                    // if(data) {
                        //  saved the new distributions
                        // saveDistributionsData(user.user, userRewards)
                    // }
                  }

             } catch(err) {
                 console.log(err)
                //  process.report.writeReport(err)
             }
    }

}


async function saveDistributionsData(user, points) {
    const receiverExists = await SpicesDistribution.find({user});
    if(receiverExists) return;
    const newDistribution = new SpicesDistribution({ user, points });
    await newDistribution.save();
}