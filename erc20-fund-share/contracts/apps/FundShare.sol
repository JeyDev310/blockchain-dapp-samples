// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;


import "../utils/AuthorizableU.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

contract FundShare is AuthorizableU {
    using SafeMathUpgradeable for uint256;
    ////////////////////////////////////////////////////////////////////////
    // State variables
    ////////////////////////////////////////////////////////////////////////

    struct UserFund {
        bool isVesting;
        uint256 fundAmount;        // Fund amount
        uint256 withdrawnAmount;   // Withdrawn amount
        uint256 depositedTime;     // deposited time
    }

    mapping(address => UserFund) public userFunds;
    uint256 public vestingDuration;
    uint256 public percentBasicPoint;


    ////////////////////////////////////////////////////////////////////////
    // Events & Modifiers
    ////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////
    // Initialization functions
    ////////////////////////////////////////////////////////////////////////
    function initialize() public virtual initializer {
        __Authorizable_init();
        vestingDuration = 2592000;  // 1 month
        percentBasicPoint = 10000;
    }

    function shareFunds(bool isVesting, address[] memory senders, uint256[] memory percents) public payable onlyOwner {
        UserFund storage userFund;
        uint256 totalFund = msg.value;

        for (uint i=0; i<senders.length; i++) {
            userFund = userFunds[senders[i]];
            userFund.fundAmount = userFund.fundAmount + totalFund.mul(percents[i]).div(percentBasicPoint);
            userFund.depositedTime = block.timestamp;
            userFund.isVesting = isVesting;
        }
    }

    function withdrawFund() public {
        uint256 withdrawalAmount = _calcWithdrawalAmount();
        require( withdrawalAmount > 0, "No withdrawal amount");

        UserFund storage userFund = userFunds[_msgSender()];
        userFund.withdrawnAmount = userFund.withdrawnAmount.add(withdrawalAmount);

        payable(_msgSender()).transfer(withdrawalAmount);
    }

    function _calcWithdrawalAmount() private view returns (uint256) {
        UserFund storage userFund = userFunds[_msgSender()];
        uint256 withdrawalAmount = 0;

        if (userFund.fundAmount == 0) {
            return 0;
        } else if (!userFund.isVesting) {
            withdrawalAmount = userFund.fundAmount - userFund.withdrawnAmount;
        } else if (block.timestamp >= userFund.depositedTime.add(vestingDuration)) {
            withdrawalAmount = userFund.fundAmount - userFund.withdrawnAmount;
        } else {
            uint256 vestingAmount = userFund.fundAmount.mul(block.timestamp.sub(userFund.depositedTime)).div(vestingDuration);
            withdrawalAmount = Math.min(userFund.fundAmount - userFund.withdrawnAmount, vestingAmount);
        }
        withdrawalAmount = Math.min(withdrawalAmount, address(this).balance);
        return withdrawalAmount;
    }    
}
