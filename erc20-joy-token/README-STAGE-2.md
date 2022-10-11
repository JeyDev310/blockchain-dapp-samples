joyV2:  0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5
xJoyV2: 0x592a74d0228999ea06010fdc4f954374289bc952
saleV2: 0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c
MIGRATOR: 0xA6E9F7C87033e3483582a992969fAb47126E72D0

V2 LP PAIR JOYV2/USDC - 0x3A3A0669F06AE44f38137Dd4A83c1A2899FcF92a
V1 LP PAIR JOYV1/WETH - 0x0a4ccfdc42013bd01420cc8aa1e34e77ce28c580

Joystick Phase 2

The Flashbots tutorial should be used by both the JoyV1 LP Wallet and the JoyV1 Wallet
https://medium.com/alchemistcoin/how-to-add-flashbots-protect-rpc-to-your-metamask-3f1412a16787

[] JOYSTICK V1 REPO WITH OZ MATCHING OLDER VERSION - https://github.com/Liberalite/JOYSTICK
[x] 1. Deploy LP Migrator Contract
[x] 2. JOYV1 Gnosis LP Owners must call joyToken.setTransferMode(3);
[x] 3. JOYV1 Gnosis LP Owners must call joyToken.addWhiteList("0xA6E9F7C87033e3483582a992969fAb47126E72D0"));
[x] 4. JOYV1 Gnosis LP Owners can now call MIGRATOR.removeLiquidity()
[x] 5. Send Liquidity from v1 LP owner to v2 LP Gnosis Wallet

[] JOYSTICK V2 REPO WITH OZ MATCHING LATEST VERSION - https://github.com/Joystick-Gaming-IO/JG-SC
[x] 6. Snapshot all JoyV1 Holders
  [x] + all 5 JoyTokenV1 LP Holders using Pauls Scripts
  [x] + all extra 180 custom addressess to split 4.8B JoyV1 Treasury Address
  [x] + mint JoyV2 for LP V2 Gnosis Wallet
[x] 7. Transfer Ownership from Gnosis Safe Wallet to Deployer Hot Wallet
[x] 8. joyToken.addManyToWhitelist(Hot_Wallet_Address, V2_LP_Holder_Address, ADDRESS_ZERO)
[x] 9. setTransferMode(2) to block all transfers except from whitelisted Gnosis Safe, Hot Wallet and ADDRESS_ZERO
[x] 10. Mint JoyTokenV2 matching JoyV1 Token Holders Balances using joyToken.mintMany()
[x] 11. Remove Whitelist (Hot_Wallet, V2_LP_Holder and ADDRESS_ZERO)
[x] 12. Transfer Ownership back to Gnosis Safe Owner Wallet
[x] 13. Add initial liquidity for JoyV2/USDC Pair and set initial valuation
[x] 14. setTransferMode(1) to allow all transfers
[x] 15. PresaleV2 Start Sale
[x] 16. JoyV2 Enable MEV Protection
[x] 17. JoyV2 remove Hot Wallet from Admin
[] 18. JoyV2 remove LP V2 Address from Whitelist

1. First thing we are doing to do is to deploy JoyV1 Liquidity Migrator contract.
2. In Gnosis UI -> Contract Interactions add:
Address: 0xdb4D1099D53e92593430e33483Db41c63525f55F
Method we want to run: setTransferMode
Param: 3
ABI:
[
  {
    inputs: [
      {
        internalType: "uint8",
        name: "_mode",
        type: "uint8",
      },
    ],
    name: "setTransferMode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
]

  3. Address: 0xdb4D1099D53e92593430e33483Db41c63525f55F
Method: we want to run: addWhiteList
Param: MIGRATOR Contract Address - need to deploy it first
ABI:
[
    {
    inputs: [
      {
        internalType: "address",
        name: "_toAdd",
        type: "address",
      },
    ],
    name: "addWhiteList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]

4. 
Address: MIGRATOR Contract Address - need to deploy it first
Method: we want to run: removeLiquidity
Param: MIGRATOR Contract Address - need to deploy it first
ABI:
[
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "removeLiquidity",
    outputs: [
      {
        internalType: "uint256",
        name: "amountWeth",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  }
  ]
  
  5. Gnosis Safe LP1 Owner sends tokens to Gnosis Safe LP2 Owner

6. Mint JoyV2 to V2 LP Wallet that will add initial JoyV2/USDC Liquidity
Address: 0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5
Method: mint
Params: (LP2OwnerAddress, amountOfJoyV2)
ABI:
[ 
 {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
]

9. Transfer Ownership from Gnosis Safe V2 Owner to Deployer Hot Wallet
Address: 0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5
Method: transferOwnership
Params: 0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6
ABI:
[
{
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
]