import { goBobInstance } from "../constants/index.js";
import axios from "axios";

const isWalletRegistered = async(userWallet) => {
    const { data } = await axios.get(`${goBobInstance}/user/${userWallet}`)
    const isUserExists = data?.ok;
    
    if(!isUserExists) {
        throw new Error("wallet is not registered");
    }

    console.log(isUserExists)
    return isUserExists;
}


export { isWalletRegistered };