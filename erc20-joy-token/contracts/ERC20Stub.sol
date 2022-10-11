// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Stub is ERC20 {

    constructor(string memory name, string memory symbol, uint256 supply) 
        ERC20(name, symbol) {
        _mint(msg.sender, supply);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
