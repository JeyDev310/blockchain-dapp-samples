const { ethers } = require("hardhat")

(async () => {
    const block = await ethers.provider.getBlock('latest')
    const deadline = block.timestamp + 600 // now + 10 minute
})()