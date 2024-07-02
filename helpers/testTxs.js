import FailedTx from "../models/failedTxs.model.js"
import { eventContract, explorerBob, rampageV1 } from "../constants/index.js";
import RampagePage from "../models/rampagePage.model.js"
import RampageUser from "../models/rampageUsers.model.js"
import Page from "../models/pageData.model.js";
import User from "../models/user.model.js"
import axios from "axios";
import fs from "fs"

export const getInternalRampageUsers = async() => {
    const internalTxsPages = []
    const internalTxs = await Page.find({})

    try {
        for (const tx of internalTxs) {
                internalTxsPages.push(tx)
        }

        console.log(internalTxs.length)
        fs.writeFileSync("rampageUsers.js", JSON.stringify(internalTxsPages))
    } catch(err) {
        console.log(err)
    }
}


const getInternalRampageTxs = async() => {
    let currentIdx = 0;
    const pageData = await RampagePage.find({})
    const page = pageData[pageData.length-1]

    // &block_number=${page.block_number}&fee=${page.fee}&hash=${page.hash}&inserted_at=${page.inserted_at}&index=${page.index}&items_count=${page.items_count}&value=${page.value}
    const url = `${explorerBob}/addresses/${rampageV1}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`

    const { data } = await axios.get(url)
    const onlyCall = data["items"].filter(item => item.type == "call" && item?.success == true)

    console.log(onlyCall)
    console.log(data?.next_page_params)

    const { block_number, index, items_count, transaction_index } = data?.next_page_params
    // block_number, fee, hash, inserted_at, index, items_count, value 
    if(block_number && index && items_count && transaction_index) {
        currentIdx++;
        const newPage = new RampagePage({ block_number, index, items_count, transaction_index })
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
    const isFailedUserAlreadyExists = await RampageUser.findOne({ user })

    console.log(user)
    try {
        //  check if the address is valid
         if(user == "") {
            throw new Error("failed txs user address cannot be zero")
            return;
         }
    
        //  check whether the wallet already exist or not in the wallet storage
         if(isFailedUserAlreadyExists) {
            throw new Error("failed txs user has been indexed")
            return;
         }
    
         const rampageUsers = new RampageUser({ user, rampageUser: true }) 
         await rampageUsers.save()
        
    } catch (error) {
        console.log(error)
    }
  
}

// 
export const indexingRampage = async() => {

    try {
        const internalTxs = await getInternalRampageTxs()
        let user = ""
    
        internalTxs.map(async(tx) => {
            const url = `https://explorer.gobob.xyz/api/v2/transactions/${tx?.transaction_hash}`
            const { data } = await axios.get(url)
            
            console.log(tx?.transaction_hash)
            user = data?.from?.hash
            console.log(tx.success)
            userIndexed_(user)
        })

    } catch(err) {
        console.log(err)
    }

}