import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, goBobInstance } from "../constants/index.js";
import axios from "axios";
import User from "../models/user.model.js"
import Page from "../models/pageData.model.js";
import fs from "fs"

/**
 * @dev get contract
 * @returns eventCa - contract
 */
const getContract = async() => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.BOB_RPC_MAINNET)
    const eventCa = new ethers.Contract(eventContract, EventCoreAbi.abi, provider);
    return eventCa;
}


export const collectUsers = async() => {

    // const url = `https://explorer.gobob.xyz/api/v2/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=3357482&index=3&items_count=250&transaction_index=1`
    // const { data } = await axios.get(url)
    // const { block_number, index, items_count, transaction_index } = data?.next_page_params

    // console.log(data?.next_page_params)

    // await fs.writeFile("page.json", JSON.stringify({ block_number, index, items_count, transaction_index }), (fileData => {
    //     console.log(fileData)
    // }))

    // return {
    //     blockNumber: block_number,
    //     idx: index,
    //     itemCount: items_count,
    //     txIndex: transaction_index
    // }
}

/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only account creation txs
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

    console.log(data)

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
    
         const newUser = new User({ user }) 
         await newUser.save()
        
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
        
        user = data?.from?.hash
        userIndexed_(user)
    })
    
    return user

}


const getUserDetails = async(user) => {
    const contract = await getContract()
    const userDetails = await contract.getUser(user)
    const userPoints = userDetails["points"].toString()
    const isRampageRegistered = userDetails["accountInitialized"];

    console.log(isRampageRegistered)

    return {
        points: userPoints,
        rampageRegistered: isRampageRegistered
    };
}


const _getTotalPoints = async() => {
    const contract = await getContract()
    const totalPoints = await contract.getTotalPoints();
     
    console.log(totalPoints.toString())
    return totalPoints
}


const getTotalUsers = async() => {
     const contract = await getContract()
    const totalUsers = await contract.getTotalUsers();

     console.log(totalUsers.toString())
     return totalUsers
}

const getBotSpices = async() => {
    const { data } = await axios.get(`${goBobInstance}/partners`)
    const filteredResults = data?.partners.filter(partner => partner.name == "BOTS OF BITCOIN ")
    const totalSpices = filteredResults[0]?.total_points;

     console.log(totalSpices)
     return totalSpices;
}


const calculateRewards = async(userPoints) => {
     const totalSpices = await getBotSpices();
     const totalPoints = await _getTotalPoints();
     const DECIMALS = 1e8;

// "Z" = "User RP" * YY

// and transfer spice equalling of 1% of Z's value
    const adjustReward = (Number(totalSpices) / Number(totalPoints).toFixed(8)) * userPoints
     console.log(`rewards ${adjustReward}`)
    //  console.log(Number((totalPoints * DECIMALS)/ DECIMALS).toFixed(8))
}

const isFusionRegistered = async(userWallet) => {
    const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
    const isUserExists = data?.ok;
    
    if(!isUserExists) {
        throw new Error("wallet is not registered");
    }

    console.log(isUserExists)
    return isUserExists;
}


/**
 * @dev check, calculate and distribute rewards to user that have RP
 */

export const distributeRewards = async() => {
    const registeredUsers = await User.find();

    registeredUsers.map(async(user) => {
        const fusionRegistered = await isFusionRegistered(user.user);
         const { points, rampageRegistered } = await getUserDetails(user.user);
        const userRewards = await calculateRewards(points)
        console.log(points)

         if(points && fusionRegistered && rampageRegistered) {
            
             //  spice distribution call
             // const { data } = await axios.post(`${goBobInstance}/distribute-points`, {
             //     toAddress: "",
             //     points: "0"
             // })
         }


    })
}