import { eventContract, goBobInstance, explorerBob } from "../constants/index.js";
import axios from "axios";
import fetch from "node-fetch"
import { calculateRewards } from "./actions.js";
import {  getUserDetails, isFusionRegistered, totalUserIsEqual } from "./infos.js"
import EligibleUsers from "../models/eligibleUsers.model.js"
import Page from "../models/pageData.model.js";
import User from "../models/allUsers.model.js";
/**
 * @dev getting internal txs of EventCore to retrieved recently account creation
 * @returns onlyCall - returns only a success account creation txs
 */
const getInternalTxs = async() => {
    try {
        const isTotalUsersEqual = await totalUserIsEqual();
        const pages = await Page.find({})
        const page = pages[pages.length-1]
        let url = ''

        if(pages.length > 0 || !isTotalUsersEqual) {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`
        } else {
            url = `${explorerBob}/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from`
        }

        const {data} = await axios.get(url)
        const accountCreationTxs = data["items"].filter(item => item.type == "call" && item?.success == true)
        
        if(data?.next_page_params && !isTotalUsersEqual) {
            const { block_number, index, items_count, transaction_index } = data?.next_page_params
            const pageExists = await Page({ block_number })

            if(!pageExists) {
                const newPage = new Page({ block_number, index, items_count, transaction_index })
                await newPage.save()
                console.log(`new page being saved ${block_number}`)
                return
            }
            console.log(`no new page being saved`)
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
const eligibleUsersIndexed_ = async(user) => {
    try {
        const isUserAlreadyExists = await EligibleUsers.findOne({ toAddress: user })
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
         }
    
         if(!rampageRegistered || !isFusionMember) {
             console.log("not eligible for rewards receiver")
         }

         const eligibleUsers = new EligibleUsers({ toAddress: user, points: rewards }) 
         await eligibleUsers.save()
        
    } catch (error) {
        console.log(error)
    }
  
}

const allUsersIndexed_ = async(user) => {
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
         }

         const eligibleUsers = new EligibleUsers({ toAddress: user, points: rewards }) 
         await eligibleUsers.save()
        
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
            const isAlreadyExistsOnEligibleUsers = await EligibleUsers.findOne({ toAddress: userAddr })
            const isAlreadyExistsOnAllUsers = await User.findOne({ user })

            if(isAlreadyExistsOnEligibleUsers && isAlreadyExistsOnEligibleUsers) continue;
            allUsersIndexed_(userAddr) // indexing all users

            if(points <= 0) continue;
            eligibleUsersIndexed_(userAddr); // indexing only eligibleUsers for rewards
        }

    } catch(err) {
        console.log(err)
    }

}
