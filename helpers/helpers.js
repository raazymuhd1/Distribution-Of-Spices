import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, rampageV1, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import User from "../models/user.model.js"
import SpicesDistribution from "../models/spicesDistributions.model.js";
import Page from "../models/pageData.model.js";
import RampageNext from "../models/rampageNextPage.model.js"
// import RampagePage from "../models/rampagePage.model.js";

/**
 * @dev get contract
 * @returns eventCa - contract
 */
const getContract = async() => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.BOB_RPC_MAINNET)
    const eventCa = new ethers.Contract(eventContract, EventCoreAbi.abi, provider);
    return eventCa;
}


const getNewRegisteredUser = async() => {
    const url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
     const { data } = await axios.get(url)
     const newUsers = data["items"].filter(item => item.type == "call")
     
     console.log(data?.next_page_params)
     return newUsers
}


// GET ALL RAMPAGE USERS AND INDEX IT
const indexingAllRampageUsers = async() => {
    const rampageData = await RampageNext.find({})
    const rampagePage = rampageData[rampageData.length-1]
    let rampageUsers = []

    console.log(rampageData.length)

    // 
    // if(rampagePage && "block_number" in rampagePage) {
        const url = `https://explorer.gobob.xyz/api/v2/addresses/${rampageV1}/internal-transactions?filter=to%20%7C%20from&block_number=2943155&index=2&items_count=5050&transaction_index=1`
    
        const { data } = await axios.get(url)
        rampageUsers = data["items"].filter(item => item?.type == "call")
    
        console.log(data)
    
        // const { block_number, index, items_count, transaction_index } = data?.next_page_params
    
        // if(block_number && index && items_count && transaction_index) {
        //     const nextPage = new RampageNext({ block_number, index, items_count, transaction_index })
        //     await nextPage.save()
        // }

    // }

    return rampageUsers;
}

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only a success account creation txs
 */
const getInternalTxs = async() => {
    let currentIdx = 0;
    const pageData = await Page.find({})
    const page = pageData[pageData.length-1]

    // &block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}
    const url = `https://explorer.gobob.xyz/api/v2/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`

    try {
        const { data } = await axios.get(url)
        const onlyCall = data["items"].filter(item => item.type == "call" && item?.success == true)

        console.log(data?.next_page_params)

        const { block_number, index, items_count, transaction_index } = data?.next_page_params

        if(block_number && index && items_count && transaction_index) {
            currentIdx++;
            const newPage = new Page({ block_number, index, items_count, transaction_index })
            await newPage.save()
        }

        // console.log(data?.next_page_params)

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
    const isUserAlreadyExists = await User.findOne({ user })

    console.log(user)
    try {
        //  check if the address is valid
         if(user == "") {
            throw new Error("failed txs user address cannot be zero")
            return;
         }
    
        //  check whether the wallet already exist or not in the wallet storage
         if(isUserAlreadyExists) {
            throw new Error("failed txs user has been indexed")
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
    const internalTxs = await getInternalTxs()
    let user = ""

    internalTxs.map(async(tx) => {
        const url = `https://explorer.gobob.xyz/api/v2/transactions/${tx?.transaction_hash}`
        const { data } = await axios.get(url)
        
        if(data?.method == "createAccount" || data?.method == "dailyLogin" && data?.status == "ok") {
            user = data?.from?.hash
            userIndexed_(user)
            return;
        }

        console.log("not account creation tx")
    })

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
    console.log(totalUsers.toString())
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
    const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
    const isUserExists = data?.ok;
    
    try{
        if(!isUserExists) {
            await User.deleteOne({ user: userWallet })
            console.log("deleted")
            throw new Error("wallet is not registered");
        }
    
        return isUserExists;
    } catch(err) {
        console.log(err)
        return err
    }
}

// THIS FUNCTION WILL BE EXECUTED EACH 24 hours, TO REMOVE ALL THE LAST 24 DISTRIBUTIONS DATA.
export const removeLast24Distributions = async() => {
    const last24DistributionsRemoved = await SpicesDistribution.deleteMany({ amountOfReward: { $gte: 0 } });
    console.log(last24DistributionsRemoved)
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

// CHECK PAST DISTRIBUTIONS, TO PREVENT POINTS FROM BEING DOUBLE SPEND
/**
 * - create a distributions collection
 * - save all user that has been receiving spices rewards and an amount they get
 * - check if eligible users has been receiving the rewards today or not, if they do then skip to another eligible users (and so on)
 * - after 24 hours, Clears out all the distributions data for yesterday
 */
export const checkPastDistributions = async(user) => {
    // const { data } = await axios.get(`${goBobInstance}/past-distributions?page=1&limit=500`)
    const distributes = await SpicesDistribution.find({});
    const distributedData = distributes.map(distri => distri.user)
    
    if(distributedData.includes(user)) return true;
    return false;
   
}

const calculateRewards = async(userPoints) => {
     const totalSpices = await getBotSpices();
     const totalPoints = await _getTotalPoints();
     const rewardPercentage = 1;
     const testAmount = Number(totalSpices) / 1000 // => 14838.760384185

    // const adjustReward = (Number(totalSpices) / Number(totalPoints)) * userPoints;
    const adjustReward = (testAmount / Number(totalPoints)) * userPoints;
    const totalRewards = (adjustReward * rewardPercentage) / 100
    const formattedReward = totalRewards.toFixed(8);

     console.log(`rewards ${formattedReward}`)
    //  return formattedReward;
    console.log(testAmount)
}

/**
 * @dev check, calculate and distribute rewards to user that have RP
 */


export const distributeRewards = async() => {
    let testUser = 4;
    const totalusers = await _getTotalUsers();
    const usersPerRound = totalusers / 24;
    let limit = usersPerRound;
    // if users has been rewarded, then skip to the next 339 users ( skip )
    // q - how to implement checking if user already received the rewards then skip to next batches of users??
    const randomSkip = Math.floor(Math.random() * usersPerRound)
    const registeredUsers = await User.find({}).skip(randomSkip).limit(limit)

    console.log(totalusers)

    // for(const user of registeredUsers) {
    //      const distributed = await checkPastDistributions(user.user)

    //      if (distributed) {
    //         console.log(`User ${user.user} already received rewards, skipping...`);
    //         continue; // Skip to the next user
    //     }

    //      try {
    //       // const fusionRegistered = await isFusionRegistered(user.user);
    //               const { points, rampageRegistered } = await getUserDetails(user.user);
    //              const userRewards = await calculateRewards(points)
     
    //              //  if(points && fusionRegistered && rampageRegistered) {
                     
    //                   //  spice distribution call
    //                   // const { data } = await axios.post(`${goBobInstance}/distribute-points`, {
    //                   //     toAddress: user.user,
    //                   //     points: userRewards
    //                   // })
    //              //  }

    //             //  saved the new distributions
    //             //  const newDistribution = new SpicesDistribution({ user: user.user, points: userRewards });
    //             // await newDistribution.save();
     
    //          } catch(err) {
    //              console.log(err)
    //          }

    // }
}
