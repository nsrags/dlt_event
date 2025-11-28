//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
	function forceApprove(address owner, address spender, uint256 amount) external returns (bool);
}

// INTERFACE for the external ExchangeRate contract
interface IExchangeRate {
    // We call this to update the rate and get the return value is SCALED)
    function refreshAndGetExchangeRate() external returns (uint256); 

}

contract TokenSwapperWithExchangeRate {
    address public cashToken;
    address public mmfToken;
    
	// NEW: State variable to hold the address of the ExchangeRate contract
    IExchangeRate private exchangeRateContract;
	
    // --- Access Control ---
    address public owner;
    
	// Scaling factor (10^18) for fixed-point math, representing 1.0 unit.
    uint256 private constant RAY = 1e18; 
	
    // --- Events ---
    event ConversionRateUpdated(uint256 oldRate, uint256 newRate, uint256 newTimestamp, address indexed updater);
	
    struct Position {
        uint256 balanceB;
        uint256 lastUpdate;
    }

    mapping(address => Position) public positions;

    constructor(address _cashToken, address _mmfToken, address _exchangeRateContract) {
        cashToken = _cashToken;
        mmfToken = _mmfToken;
		exchangeRateContract = IExchangeRate(_exchangeRateContract);
		owner = msg.sender;
    }

	function buyMMFTokenWithExchangeRate(address sender, address recipient, uint256 amountA) external {
		// This call updates the rate and returns the SCALED rate (e.g., 125)
		uint256 currConversionRateScaled = exchangeRateContract.refreshAndGetExchangeRate();
        
		uint256 convertedAmountA = _convertAmount(amountA, currConversionRateScaled);
		
		bool approvedA = IERC20(cashToken).forceApprove(sender, address(this), convertedAmountA);
		require(approvedA, "Swap: cashToken forceApprove failed or not authorized"); 
		
		bool approvedB = IERC20(mmfToken).forceApprove(recipient, address(this), amountA);
		require(approvedB, "Swap: mmfToken forceApprove failed or not authorized"); 
		// success
		bool successA = IERC20(cashToken).transferFrom(sender, recipient, convertedAmountA);
		require(successA, "cashToken transferFrom failed");
		
		bool successB = IERC20(mmfToken).transferFrom(recipient, sender, amountA);
		require(successB, "mmfToken transferFrom failed");
		
		positions[msg.sender].balanceB += amountA;
		positions[msg.sender].lastUpdate = block.timestamp;
	}
	
	function redeemMMFTokenWithExchangeRate(address sender, address recipient, uint256 amountA) external {
		// This call updates the rate and returns the SCALED rate (e.g., 125)
		uint256 currConversionRateScaled = exchangeRateContract.refreshAndGetExchangeRate(); // Updates the rate (if time elapsed)
		
		uint256 convertedAmountA = _convertAmount(amountA, currConversionRateScaled);
	
		//Need to tweak cashToken and tokenB context swap as the contract is in the reverse order of constructor parameters
		bool approvedA = IERC20(mmfToken).forceApprove(sender, address(this), amountA);
		require(approvedA, "Swap: mmfToken forceApprove failed or not authorized"); 
		
		bool approvedB = IERC20(cashToken).forceApprove(recipient, address(this), convertedAmountA);
		require(approvedB, "Swap: cashToken forceApprove failed or not authorized"); 
		// success
		bool successA = IERC20(mmfToken).transferFrom(sender, recipient, amountA);
		require(successA, "mmfToken transferFrom failed");
		
		bool successB = IERC20(cashToken).transferFrom(recipient, sender, convertedAmountA);
		require(successB, "cashToken transferFrom failed");
	}
	
	/**
     * @notice Performs the fixed-point multiplication and division for conversion.
     */
    function _convertAmount(uint256 amount, uint256 rateScaled) internal pure returns (uint256) {
        uint256 convertedAmount = (amount * rateScaled) / 100;
        require(convertedAmount > 0, "Conversion resulted in zero tokens.");
        return convertedAmount;
    }
}