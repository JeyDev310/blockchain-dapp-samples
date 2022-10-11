pragma solidity >=0.5.0;

// SPDX-License-Identifier: MIT

interface IWETH {
    function deposit(uint wad) external payable;
    function withdraw(uint wad) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
}