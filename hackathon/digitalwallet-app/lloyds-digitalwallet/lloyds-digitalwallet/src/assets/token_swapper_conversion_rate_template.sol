//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function forceApprove(
        address owner,
        address spender,
        uint256 amount
    ) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// INTERFACE for the external ConversionRate contract
interface IConversionRate {
    // We call this to update the rate and get the return value is SCALED)
    function refreshAndGetConversionRate() external returns (uint256);
}

//NOTE: Users can change the name of contract and add their own team preference name.
// WARNING: ***Don't change the names of these methods of "buyMMFTokenWithConversionRate", "sellMMFTokenWithConversionRate" and "executeTrade".***
// Users can think innovatively and code the logic for sell and trade methods, so that they earn more profits.
// Users can take buyMMFTokenWithConversionRate method as reference for implementing the "sellMMFTokenWithConversionRate".

contract //TODO:YourOwn-SwapContract-name-Placholder {
    address public cashToken;
    address public mmfToken;

    // NEW: State variable to hold the address of the ConversionRate contract
    IConversionRate private conversionRateContract;

    // --- Access Control ---
    address public owner;

    // Scaling factor (10^18) for fixed-point math, representing 1.0 unit.
    /* Rate of 0.5 (calcualtion in RAY 0.5x10^18) is   500,000,000,000,000,000
     * Rate of 1.0 (calcualtion in RAY 1.0x10^18) is 1,000,000,000,000,000,000
     * Rate of 1.0 (calcualtion in RAY 1.5x10^18) is 1,500,000,000,000,000,000
     * Rate of 1.0 (calcualtion in RAY 2.0x10^18) is 2,000,000,000,000,000,000
     */
    uint256 private constant RAY = 1e18;

    // --- Events ---
    event ConversionRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 newTimestamp,
        address indexed updater
    );

    struct Position {
        uint256 balanceB;
        uint256 lastUpdate;
    }

    mapping(address => Position) public positions;

    constructor(
        address _cashToken,
        address _mmfToken,
        address _conversionRateContract
    ) {
        cashToken = _cashToken;
        mmfToken = _mmfToken;
        conversionRateContract = IConversionRate(_conversionRateContract);
        owner = msg.sender;
    }

    function buyMMFTokenWithConversionRate(
        address sender,
        address recipient,
        uint256 amountA
    ) public {
        // This call updates the rate and returns the SCALED rate (e.g., 125)
        uint256 currConversionRateScaled = conversionRateContract
            .refreshAndGetConversionRate();

        uint256 convertedAmountA = _convertAmount(
            amountA,
            currConversionRateScaled
        );

        bool approvedA = IERC20(cashToken).forceApprove(
            sender,
            address(this),
            convertedAmountA
        );
        require(
            approvedA,
            "Swap: cashToken forceApprove failed or not authorized"
        );

        bool approvedB = IERC20(mmfToken).forceApprove(
            recipient,
            address(this),
            amountA
        );
        require(
            approvedB,
            "Swap: mmfToken forceApprove failed or not authorized"
        );
        // success
        bool successA = IERC20(cashToken).transferFrom(
            sender,
            recipient,
            convertedAmountA
        );
        require(successA, "cashToken transferFrom failed");

        bool successB = IERC20(mmfToken).transferFrom(
            recipient,
            sender,
            amountA
        );
        require(successB, "mmfToken transferFrom failed");

        //NOTE: Below is for Buy only, Sale method doesn't required below>>
        positions[msg.sender].balanceB += amountA;
        positions[msg.sender].lastUpdate = block.timestamp;
    }

    function sellMMFTokenWithConversionRate(
        address sender,
        address recipient,
        uint256 amountA
    ) public {
        // This call updates the rate and returns the SCALED rate (e.g., 125)
        uint256 currConversionRateScaled = conversionRateContract
            .refreshAndGetConversionRate(); // Updates the rate (if time elapsed)

        uint256 convertedAmountA = _convertAmount(
            amountA,
            currConversionRateScaled
        );

     //TODO: {{PlaceHolder for Sell MMF token implementation}}.
	 //REFER ABOVE buyMMFTokenWithConversionRate, HINT: swap/reverse cashToken and mmfToken places
    }

    /**
     * @notice Executes a trade based on the current conversion rate, with a balance check.
     * @param sender The address paying the input token.
     * @param recipient The address receiving the output token.
     * @param amountA The amount of the input token.
     */
    function executeTrade(
        address sender,
        address recipient,
        uint256 amountA
    ) external returns (string memory) {
        
        // TODO: {{PlaceHoder for adding innovation code for trading
		// - User can Buy & Sell based on the Converstion rate which they can look for.
		// 1. call to get the current coverstion rate.
		// 2. apply the checks and perform actions which buy or sell, 
		// ex: buy only when conversion is less than 100 or sell only when conversion greater than 100.  
        //	use/call method buyMMFTokenWithConversionRate for Buyig MMF tokens.
		//  use/call method sellMMFTokenWithConversionRate for selling the MMF tokens.
		//}}
		// 1. Call to refresh and get the current scaled rate.
        //uint256 currConversionRateScaled = conversionRateContract
          //  .refreshAndGetConversionRate();
    }

    /**
     * @notice Performs the fixed-point multiplication and division for conversion.
     */
    function _convertAmount(
        uint256 amount,
        uint256 rateScaled
    ) internal pure returns (uint256) {
        uint256 convertedAmount = (amount * rateScaled) / 100;
        require(convertedAmount > 0, "Conversion resulted in zero tokens.");
        return convertedAmount;
    }
}
