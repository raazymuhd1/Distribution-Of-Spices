import crypto from "crypto"
import { ethers } from "ethers"

export const handleKeyEncryption = (rpcUrl) => {
    const algorithm = "aes256"
    const password = 'reallySecret'
    
    const cipher = crypto.createCipher(algorithm, password);
    const encrypted = cipher.update(rpcUrl, "utf8", "hex") + cipher.final("hex")

    const decipher = crypto.createDecipher(algorithm, password)
    const decrypted = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8")
    
    console.log(encrypted)
    return decrypted
}

