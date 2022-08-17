/* 
1.getWeth
2.get aave lending pool contract using ILendingPoolAddressesProvider
3.before depositing approve
4.deposit
5.get user account data  borrowing so u know how much to borrow without liquiting the assest
6.Borrow 
*/
const { getNamedAccounts, ethers, network } = require("hardhat")
const { getWeth, iWethAddress, AMOUNT } = require("./getWeth")
const { networkConfig } = require("../helper-hardhat-config")

const main = async () => {
    await getWeth()
    const iWethAddress = networkConfig[network.config.chainId]["wethToken"]
    const { deployer } = await getNamedAccounts()
    //get lending pool contract
    const lendingPool = await getLendingPool(deployer)
    console.log(`Lending Pool Address:${lendingPool.address}`)
    //approve before depositing
    await approveErc20(iWethAddress, lendingPool.address, deployer, AMOUNT)
    //depositing
    console.log("depositing.....")
    await lendingPool.deposit(iWethAddress, AMOUNT, deployer, 0)
    console.log("Deposited")
    //get user Account
    const { availableBorrowsETH, totalDebtETH } = await getUserData(lendingPool, deployer)
    //get dai price using chainlink price feed
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH * 0.95 * (1 / daiPrice)
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    const daiAddress = networkConfig[network.config.chainId]["daiToken"]
    console.log(`Borrowing.....`)
    await borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getUserData(lendingPool, deployer)
    await repay(daiAddress, lendingPool, lendingPool.address, deployer, amountDaiToBorrowWei)
    await getUserData(lendingPool, deployer)
}

//ILendingPoolAddressesProvider returns  address of lending pool ,using which we can call  aave contract lending pool
const getLendingPool = async (deployer) => {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId]["lendingPoolAddressesProvider"],
        deployer
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, deployer)
    return lendingPool
}
//approveErc20
const approveErc20 = async (iWethAddress, spenderAddress, account, amountToSpend) => {
    const erc20 = await ethers.getContractAt("IWeth", iWethAddress, account)
    const tx = await erc20.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved")
}

//getUserAccountData
const getUserData = async (lendingPool, account) => {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

const getDaiPrice = async () => {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId]["daiEthPriceFeed"]
    )
    const daiPrice = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`Dai/Eth price is ${daiPrice.toString()}`)
    return daiPrice
}

const borrowDai = async (daiAddress, lendingPool, amountDaiToBorrowWei, account) => {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log(`You Have borrowed`)
}

const repay = async (daiAddress, lendingPool, lendingPoolAddress, account, amount) => {
    await approveErc20(daiAddress, lendingPoolAddress, account, amount)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
