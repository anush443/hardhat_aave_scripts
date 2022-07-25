const { getNamedAccounts, ethers, network } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

const AMOUNT = ethers.utils.parseEther("0.02")

const getWeth = async () => {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const iWethAddress = networkConfig[chainId]["wethToken"]
    const iWeth = await ethers.getContractAt("IWeth", iWethAddress, deployer)
    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1)
    const balance = await iWeth.balanceOf(deployer)
    console.log(`Balance: ${balance.toString()} WETH`)
}
module.exports = { getWeth, AMOUNT }
