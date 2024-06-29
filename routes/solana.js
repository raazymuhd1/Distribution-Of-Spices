import express from "express"
import axios from "axios"
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import dotenv from "dotenv"
import Redis from 'ioredis';

dotenv.config();

const redis_client = new Redis({
  host: process.env.REDIS_DB_HOST,
  password: process.env.REDIS_DB_PASSWORD,
  port: process.env.REDIS_DB_PORT,
  db: 0 
});

redis_client.on('error', function (err) {
  console.error('Redis error:', err);
});

const DECIMALS = 9;
const TOKEN_ADDRESS = 'ADZaQNyQfU3uPDkrqPkxuG6GzDBEYQ3gMXFXTNSqXr1G';
const PAIR_ADDRESS = '2nugi2lr5fy5rnxyrk67emkua2wywoya1wmbczkrrf2y';

const rpcEndpoint = process.env.SOLANA_RPC
const solanaConnection = new Connection(rpcEndpoint, 'confirmed');
const router  = express.Router()

router.get("/holding", async(req, res) => {
    const { walletAddress } = req.query;

    console.log(walletAddress)
    
    const filters = [
        {
            memcmp: {
                offset: 32,
                bytes: walletAddress,
            },            
        }
    ];

    let associatedTokenAccounts = [];

    const accounts = await solanaConnection.getParsedProgramAccounts(
        TOKEN_2022_PROGRAM_ID,
        {filters: filters}
    );
    let balance = 0;
    for (let account of accounts) {
        associatedTokenAccounts.push(account.pubkey.toBase58());

        const parsedAccountInfo = account.account.data;
        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        
        if(mintAddress != TOKEN_ADDRESS) {
            continue;
        }
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        balance += tokenBalance;
    }

    console.log(balance)

    res.status(200).json({associatedTokenAccounts,
        balance})

    //  4CvBHXkcZHTsxoJSkjy47ebxtqviuHSVmfCCArekTXXa
})

router.get("/rewards", async(req, res) => {
    const {walletAddress} = req.query

  try{
    const val = await redis_client.get(walletAddress);
    console.log('val', val);
    res.status(200).json({ val })
  }catch(error){
    console.error(error);
  }
})

router.get("/total-rewards", async(req, res) => {

  try{
    const val = await redis_client.get('totalBalance');
    console.log('val', val);
    res.status(200).json({ val })
  }catch(error){
    console.error(error);
  }
})


router.get("/get-price", async(req, res) => {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/solana/${PAIR_ADDRESS}`
      );
  
      const data = response.data;
      const pairs = data.pairs;
      const pair = pairs[0];
      const marketCap = pair.fdv;
      const priceUsd = pair.priceUsd;
  
      res.status(200).json({  marketCap, priceUsd })
    } catch (error) {
      console.error('Error fetching DexScreener data:', error);
      res.status(200).json({  marketCap: 0, priceUsd: 0 })
    }
})


export default router;