//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
	function forceApprove(address owner, address spender, uint256 amount) external returns (bool);
}

contract MMFTokenContract3 {
    address public tokenA;
    address public tokenB;
    uint256 public interestRate; // e.g., 100 = 1% per interval
    uint256 public interestInterval = 60; // seconds
    //uint256 public resetThreshold = 120; // seconds

    struct Position {
        uint256 balanceB;
        uint256 lastUpdate;
    }

    mapping(address => Position) public positions;

    constructor(address _tokenA, address _tokenB, uint256 _interestRate) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        interestRate = _interestRate; // e.g., 100 = 1%
    }

	function buyMMFTokens(address sender, address recipient, uint256 amountA) external {
		bool approvedA = IERC20(tokenA).forceApprove(sender, address(this), amountA);
		require(approvedA, "Swap: TokenA forceApprove failed or not authorized"); // Custom error message
		
		bool approvedB = IERC20(tokenB).forceApprove(recipient, address(this), amountA);
		require(approvedB, "Swap: TokenB forceApprove failed or not authorized"); // Custom error message
		// success
		bool successA = IERC20(tokenA).transferFrom(sender, recipient, amountA);
		require(successA, "TokenA transferFrom failed");
		
		bool successB = IERC20(tokenB).transferFrom(recipient, sender, amountA);
		require(successB, "TokenB transferFrom failed");
		
		// Calculate interest on existing TokenB balance
		//_applyInterest(msg.sender);
		positions[msg.sender].balanceB += amountA;
		positions[msg.sender].lastUpdate = block.timestamp;
	}
	
	function redeemMMFTokens(address sender, address recipient, uint256 amountA) external {
		// 1. Calculate the interest/bonus in Token A that the user has earned
		uint256 bonusTokensA = _calculateRedemptionBonus(msg.sender);
		uint256 amountAWithInterest = amountA + bonusTokensA;
	
		//Need to tweak tokenA and tokenB context swap as the contract is in the reverse order of constructor parameters
		bool approvedA = IERC20(tokenB).forceApprove(sender, address(this), amountA);
		require(approvedA, "Swap: TokenB forceApprove failed or not authorized"); // Custom error message
		
		bool approvedB = IERC20(tokenA).forceApprove(recipient, address(this), amountAWithInterest);
		require(approvedB, "Swap: TokenA forceApprove failed or not authorized"); // Custom error message
		// success
		bool successA = IERC20(tokenB).transferFrom(sender, recipient, amountA);
		require(successA, "TokenB transferFrom failed");
		
		bool successB = IERC20(tokenA).transferFrom(recipient, sender, amountAWithInterest);
		require(successB, "TokenA transferFrom failed");
		
		//positions[msg.sender].balanceB += amountA;
		//positions[msg.sender].lastUpdate = block.timestamp;
	}
	
	function _calculateRedemptionBonus(address user) internal returns (uint256 interestAmount) {
		Position storage pos = positions[user];
		
		// Only calculate bonus if the user has a positive balance
		if (pos.balanceB == 0) {
			pos.lastUpdate = block.timestamp;
			return 0;
		}
		
		uint256 elapsed = block.timestamp - pos.lastUpdate;

		//if (elapsed > resetThreshold) {
			// Reset interest if too much time passed
		//	pos.lastUpdate = block.timestamp;
		//	return 0;
		//}

		uint256 intervals = elapsed / interestInterval;
		
		if (intervals > 0) {
			// Use your original percentage calculation: (balanceB * interestRate * intervals) / 10000
			uint256 interest = (pos.balanceB * interestRate * intervals) / 10000;
			
			// IMPORTANT: DO NOT add interest to pos.balanceB here.
			
			// Update the timestamp to reset the timer for the next calculation.
			// We use the time that was actually counted to keep it accurate.
			pos.lastUpdate += intervals * interestInterval; 
			
			return interest;
		}
		
		// If no full interval passed, no bonus is calculated
		return 0;
	}
}
