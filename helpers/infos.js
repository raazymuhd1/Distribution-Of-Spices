import { eventContract, goBobInstance, explorerBob } from "../constants/index.js";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { ethers } from "ethers";
import axios from "axios"
import User from "../models/allUsers.model.js"
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

export const getUserDetails = async(user) => {
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


export const _getTotalPoints = async() => {
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
export const getBotSpices = async() => {
    const { data } = await axios.get(`${goBobInstance}/partners`)
    const filteredResults = data?.partners.filter(partner => partner.name == "BOTS OF BITCOIN ")
    const totalSpices = filteredResults[0]?.total_points;

     return totalSpices;
}

// check is user has been registered on fusion or not
export const isFusionRegistered = async(userWallet) => {
    try{
        const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
        const isUserExists = data?.ok;
        if(isUserExists == false) {
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

export const getTotalUsersFromDb = async() => {
    try {
        const users = await User.find({})
        return users;
    } catch(err) {
        console.log(err)
    }
}

export const totalUserIsEqual = async() => {
    try {
        const allUsersOnDb = await User.find({})
        const allUsersOnContracts = await _getTotalUsers();
        const isEqual = allUsersOnDb.length === Number(allUsersOnContracts.toString());
        console.log(allUsersOnDb.length)
        console.log("allUsersFromContract", Number(allUsersOnContracts.toString()))
        return isEqual;
    } catch(err) {
        console.log(err)
    }
}