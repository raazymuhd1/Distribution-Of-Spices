import FailedTx from "../models/failedTxs.model.js"
import { eventContract, rampageV1, goBobInstance, explorerBob } from "../constants/index.js";
import FailedTxPage from "../models/failedTxsPage.model.js"
import axios from "axios";

const getInternalFailedTxs = async() => {
    let currentIdx = 0;
    const pageData = await FailedTxPage.find({})
    const page = pageData[pageData.length-1]

    // &block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}
    const url = `https://explorer.gobob.xyz/api/v2/addresses/${eventContract}/internal-transactions?filter=to%20%7C%20from&block_number=${page.block_number}&index=${page.index}&items_count=${page.items_count}&transaction_index=${page.transaction_index}`

    const { data } = await axios.get(url)
    const onlyCall = data["items"].filter(item => item.type == "call" && item?.success == false)

    console.log(onlyCall)

    const { block_number, index, items_count, transaction_index } = data?.next_page_params

    if(block_number && index && items_count && transaction_index) {
        currentIdx++;
        const newPage = new FailedTxPage({ block_number, index, items_count, transaction_index })
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
    const isFailedUserAlreadyExists = await FailedTx.findOne({ user })

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
    
         const failedTxs = new FailedTx({ user }) 
         failedTxs.no = failedTxs.no + 1
         await failedTxs.save()
        //  const rampageUsers = new User({ user }) 
        //  await rampageUsers.save()
        
    } catch (error) {
        console.log(error)
    }
  
}

// 
export const indexingFailedUser = async() => {
    const internalTxs = await getInternalFailedTxs()
    let user = ""

    internalTxs.map(async(tx) => {
        const url = `https://explorer.gobob.xyz/api/v2/transactions/${tx?.transaction_hash}`
        const { data } = await axios.get(url)
        
        user = data?.from?.hash
        console.log(tx.success)
        userIndexed_(user)
    })

}