// SPDX-License-Identifier: UNLICENCED
pragma solidity 0.8.11;

import "../interfaces/IUniswapFactory.sol";
import "../interfaces/IUniswapRouter02.sol";
import "../interfaces/IWETH.sol";
import "./SecureToken.sol";

import "hardhat/console.sol";

contract LiquefiedToken is SecureToken {
    address public swapPair;
    IUniswapRouter02 public swapRouter;

    event TokensLiquified(uint256 tokensLiquified, uint256 ethLiquified, uint256 lpMinted);

    constructor(
        address[] memory _whitelist,
        address[] memory _blacklist,
        address[] memory _admins,
        uint256 _maxSupply,
        string memory _name,
        string memory _symbol
    ) SecureToken(_whitelist, _blacklist, _admins, _name, _symbol) {}

    function createPair() internal {
        address ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        address USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        IUniswapRouter02 _swapRouter = IUniswapRouter02(address(ROUTER_ADDRESS));
        swapPair = IUniswapFactory(_swapRouter.factory()).createPair(address(this), USDC_ADDRESS); // _swapRouter.WETH()
        swapRouter = _swapRouter;
        console.log("swapRouter %s", address(swapRouter));
        console.log("swapPair %s", address(swapPair));
    }

    function addLiquidityETH(
        uint256 tokenAmount,
        uint256 ethAmount,
        address lpReceiver
    ) external onlyOwner payable {
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = swapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            lpReceiver,
            block.timestamp
        );
        console.log("swapPair %s", swapPair);
        emit TokensLiquified(amountToken, amountETH, liquidity);
    }

    function addLiquidity(
        uint _amountA,
        uint _amountB,
        address _tokenA,
        address _tokenB,
        address lpReceiver
    ) external onlyOwner {
        // IWETH(_tokenA).transferFrom(msg.sender, address(this), _amountA);
        // IWETH(_tokenB).transferFrom(msg.sender, address(this), _amountB);

        IWETH(_tokenA).approve(address(swapRouter), _amountA);
        IWETH(_tokenB).approve(address(swapRouter), _amountB);

        (uint amountA, uint amountB, uint liquidity) = swapRouter
            .addLiquidity(
                _tokenA,
                _tokenB,
                _amountA,
                _amountB,
                0,
                0,
                lpReceiver,
                block.timestamp
            );

        emit TokensLiquified(amountA, amountB, liquidity);
    }

    receive() external payable {}
}
