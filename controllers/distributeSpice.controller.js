import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js"

const userRegistered = async(req, res) => {
    const user = req.query.user ?? ""
    const isUserAlreadyExists = await User.findOne({ user })

    console.log(user)

    //  check if the address is valid
     if(user == "") {
        res.status(StatusCodes.NO_CONTENT).json({ msg: "no wallet being passed to server" })
        return;
     }

    //  check whether the wallet already exist or not in the wallet storage
     if(isUserAlreadyExists) {
        res.status(StatusCodes.FORBIDDEN).json({ msg: "this wallet already registered" })
        return;
     }

   //   walletStorage.push(user)
     const newUser = new User({ user }) 
     await newUser.save()
   //   await fs.writeFile("registeredUser.json", JSON.stringify(walletStorage), (data) => {
   //    console.log(data)
   //   })
     res.status(StatusCodes.CREATED).json({ msg: "wallet registered", user })
}


// const distributeSpiceBasedOnPoints = async() => {

// }


export { userRegistered }