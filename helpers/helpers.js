import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, rampageV1, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import User from "../models/user.model.js"
import Page from "../models/pageData.model.js";
// import RampageUser from "../models/rampageUsers.model.js";
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
// export const indexingAllRampageUsers = async() => {
//     const rampageData = await RampagePage.find({})
//     const rampagePage = rampageData[rampageData.length-1]
//     let rampageUsers = []

//     console.log(rampageData.length)

//     if(rampagePage && "block_number" in rampagePage) {
//         const url = `${explorerBob}/addresses/${rampageV1}/transactions?filter=to%20%7C%20from&block_number=${rampagePage.block_number}&fee=${rampagePage.fee}&hash=${rampagePage.hash}&inserted_at=${rampagePage.inserted_at}&&index=${rampagePage.index}&items_count=${rampagePage.items_count}&value=${rampagePage.value}`
    
//         const { data } = await axios.get(url)
//         const accountCreationTxs = data["items"].filter(item => item?.method == "createAccount")
//         rampageUsers = accountCreationTxs.map(user => user?.from?.hash)
    
//         console.log(data)
    
//         // const { block_number, fee, hash, index, inserted_at, items_count, value } = data?.next_page_params
    
//         // if(block_number && fee && hash && index && inserted_at, items_count && value) {
//         //     const nextPage = new RampagePage({ block_number, fee, hash, index, inserted_at, items_count, value })
//         //     await nextPage.save()
//         // }

//     }

//     return rampageUsers;
// }

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation, this will be a legacy function in the future
 * @returns onlyCall - returns only account creation txs
 * @notice legacy function to obtained an old users addresses
 */
const getInternalTxs = async() => {
    let currentIdx = 0;
    const pageData = await Page.find({})
    const page = pageData[pageData.length-1]

    // previous block=3357482 index=3, items=250, txIdx=1
    const url = `https://explorer.gobob.xyz/api/v2/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`

    const { data } = await axios.get(url)
    const onlyCall = data["items"].filter(item => item.type == "call")

    const { block_number, index, items_count, transaction_index } = data?.next_page_params

    if(block_number && index && items_count && transaction_index) {
        const newPage = new Page({ block_number, index, items_count, transaction_index })
        await newPage.save()
    }

    console.log(data?.next_page_params)

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
            throw new Error("user address cannot be zero")
            return;
         }
    
        //  check whether the wallet already exist or not in the wallet storage
         if(isUserAlreadyExists) {
            throw new Error("user has been indexed")
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
    // const internalTxs = await getInternalTxs()
    // const indexedRampageUsers = await indexingAllRampageUsers();
    const newCreatedAcc = await getNewRegisteredUser()
    let user = ""

    // console.log(indexedRampageUsers)
    // indexedRampageUsers.map(user => {
    //     userIndexed_(user)
    // })

    newCreatedAcc.map(async(tx) => {
        const url = `https://explorer.gobob.xyz/api/v2/transactions/${tx?.transaction_hash}`
        const { data } = await axios.get(url)
        
        user = data?.from?.hash
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
     const DECIMALS = 1e8;

// "Z" = "User RP" * YY

// and transfer spice equalling of 1% of Z's value
    const adjustReward = (Number(totalSpices) / Number((totalPoints * DECIMALS) / DECIMALS).toFixed(8)) * userPoints
     console.log(`rewards ${adjustReward}`)
    //  console.log(Number((totalPoints * DECIMALS)/ DECIMALS).toFixed(8))
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
    let limit = 100;
    let skip = 100;
    const registeredUsers = await User.find().limit(limit).skip(skip);

    registeredUsers.map(async(user) => {
        skip += 100;

        try {
            // const fusionRegistered = await isFusionRegistered(user.user);
             const { points, rampageRegistered } = await getUserDetails(user.user);
            const userRewards = await calculateRewards(points)
    
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