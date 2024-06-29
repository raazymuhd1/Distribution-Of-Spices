import { ethers } from "ethers";
import EventCoreAbi from "../contracts/EventAbi.json" assert { type: "json" };
import { eventContract, goBobInstance } from "../constants/index.js";
import axios from "axios";
import User from "../models/user.model.js"

const getContract = async() => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.BOB_RPC_MAINNET)
    const eventCa = new ethers.Contract(eventContract, EventCoreAbi.abi, provider);
    return eventCa;
}


export const getUserPoints = async(user) => {
    const contract = await getContract()
    const getUser = await contract.getUser(user)
    const userPoints = getUser["points"].toString()
    console.log(getUser["points"].toString())
    return userPoints;
}

export const _getTotalPoints = async() => {
    const contract = await getContract()
    const totalPoints = await contract.getTotalPoints();
    console.log(totalPoints.toString())
    return totalPoints
}

export const getTotalUsers = async() => {
     const contract = await getContract()
    const totalUsers = await contract.getTotalUsers();

     console.log(totalUsers.toString())
     return totalUsers
}

export const getBotSpices = async() => {
    const { data } = await axios.get(`${goBobInstance}/partners`)
    const filteredResults = data?.partners.filter(partner => partner.name == "BOTS OF BITCOIN ")
    const totalSpices = filteredResults[0]?.total_points;

     console.log(totalSpices)
     return totalSpices;
}


export const calculateRewards = async(userPoints) => {
     const totalSpices = await getBotSpices();
     const totalPoints = await _getTotalPoints();

    //  1% from total spices being allocated for rewards
     const spicesAllocated = (totalSpices * 1) / 100;
     console.log(spicesAllocated)
}

const isWalletRegistered = async(userWallet) => {
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
        const isRegistered = await isWalletRegistered(user.user);
        console.log(isRegistered)
         const userPoints = await getUserPoints(user.user);

        //  spice distribution call
        // const { data } = await axios.post(`${goBobInstance}/distribute-points`, {
        //     toAddress: "",
        //     points: "0"
        // })

    })
}