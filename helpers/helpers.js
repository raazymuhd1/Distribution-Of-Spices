import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, rampageV1, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import User from "../models/user.model.js"
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


export const getNewRegisteredUser = async() => {
    const url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
     const { data } = await axios.get(url)
     const newUsers = data["items"].filter(item => item.type == "call")
     
     console.log(data?.next_page_params)
     return newUsers
}


// GET ALL RAMPAGE USERS AND INDEX IT
export const indexingAllRampageUsers = async() => {
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
 * @dev getting internal txs of EventCore to retrieved recently account creation, this will be a legacy function in the future
 * @returns onlyCall - returns only account creation txs
 * @notice legacy function to obtained an old users addresses
 */
const getInternalTxs = async() => {
    let currentIdx = 0;
    const pageData = await Page.find({})
    const page = pageData[pageData.length-1]

    // &block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}
    const url = `https://explorer.gobob.xyz/api/v2/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`

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
    
         const rampageUsers = new User({ user, no: isUserAlreadyExists.no + 1 }) 
         await rampageUsers.save()
        
    } catch (error) {
        console.log(error)
    }
  
}

// 
export const indexingUser = async() => {
    const internalTxs = await getInternalTxs()
    // const indexedRampageUsers = await indexingAllRampageUsers();
    // const newCreatedAcc = await getNewRegisteredUser()
    let user = ""

    internalTxs.map(async(tx) => {
        const url = `https://explorer.gobob.xyz/api/v2/transactions/${tx?.transaction_hash}`
        const { data } = await axios.get(url)
        
        user = data?.from?.hash
        console.log(tx.success)
        userIndexed_(user)
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


const calculateRewards = async(userPoints) => {
     const totalSpices = await getBotSpices();
     const totalPoints = await _getTotalPoints();
     const rewardPercentage = 1;

// "Z" = "User RP" * YY

// and transfer spice equalling of 1% of Z's value
    const adjustReward = (Number(totalSpices) / Number(totalPoints)) * userPoints;
    const totalRewards = (adjustReward * rewardPercentage) / 100
    const formattedReward = totalRewards.toFixed(8);

     console.log(`rewards ${formattedReward}`)
}

// check is user has been registered on fusion or not
const isFusionRegistered = async(userWallet) => {
    const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
    const isUserExists = data?.ok;
    
    if(!isUserExists) {
        await User.deleteOne({ user: userWallet })
        console.log("deleted")
        throw new Error("wallet is not registered");
    }

    return isUserExists;
}

// CHECK PAST DISTRIBUTIONS, TO PREVENT POINTS FROM BEING DOUBLE SPEND
export const checkPastDistributions = async(user) => {
    const { data } = await axios.get(`${goBobInstance}/past-distributions?page=1&limit=500`)

    console.log(data)
}

/**
 * @dev check, calculate and distribute rewards to user that have RP
 */

export const distributeRewards = async() => {
    let limit = 50;
    let skip = 100;
    const registeredUsers = await User.find().limit(limit)

    registeredUsers.map(async(user) => {
        // skip += 100;

        try {
            // const fusionRegistered = await isFusionRegistered(user.user);
             const { points, rampageRegistered } = await getUserDetails(user.user);
            const userRewards = await calculateRewards(points)
            const pastDistribution = await checkPastDistributions(user.user)
            console.log(pastDistribution)

            //  if(points && fusionRegistered && rampageRegistered) {
                
                 //  spice distribution call
                 // const { data } = await axios.post(`${goBobInstance}/distribute-points`, {
                 //     toAddress: "",
                 //     points: "0"
                 // })
            //  }

        } catch(err) {
            console.log(err)
        }


    })
}