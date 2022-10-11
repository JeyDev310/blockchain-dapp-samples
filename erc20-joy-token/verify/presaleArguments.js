const { ethers } = require("hardhat");
const BN_From = (number) => ethers.BigNumber.from(number)

const thirtyDays = 2592000
const oneDay = 86400

module.exports = [
    "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5",
    "0x592a74d0228999ea06010fdc4f954374289bc952",
    [
      // SEED
      {
        releasePercentBasisPoints: 250, // 2.5%
        cliff: BN_From(thirtyDays).mul(BN_From(8)), // 8 months
        releaseStep: BN_From(thirtyDays), // 30 days
        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)), // 40 months
      },
      // PRESALE
      {
        releasePercentBasisPoints: 250,
        cliff: BN_From(thirtyDays).mul(BN_From(8)),
        releaseStep: BN_From(thirtyDays),
        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
      },
      // TEAM
      {
        releasePercentBasisPoints: 250,
        cliff: BN_From(thirtyDays).mul(BN_From(10)),
        releaseStep: BN_From(thirtyDays),
        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
      },
      // PARTNERS
      {
        releasePercentBasisPoints: 250,
        cliff: BN_From(thirtyDays).mul(BN_From(12)),
        releaseStep: BN_From(thirtyDays),
        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
      },
      // DISCOUNT 55%
      {
        releasePercentBasisPoints: 13,
        cliff: BN_From(thirtyDays).mul(BN_From(12)),
        releaseStep: BN_From(oneDay),
        vestingCloseTimeline: BN_From(oneDay).mul(BN_From(730)),
      },
    ],
    4,
    "0xe24aB7eBE787A5077B8BBC344C70ff0b57545263"
];