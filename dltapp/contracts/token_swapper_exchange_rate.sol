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
    function forceApprove(
        address owner,
        address spender,
        uint256 amount
    ) external returns (bool);
}

contract TokenSwapperWithExchangeRate {
    address public tokenA;
    address public tokenB;

    // Scaling factor (10^18) for fixed-point math, representing 1.0 unit.
    uint256 private constant RAY = 1e18;

    // The divisor used to scale the 18-decimal RAY value down to an integer
    // with 2 decimal places of precision (18 - 2 = 16 decimals to remove).
    // Client must divide the result by 100 to get the float (e.g., 125 -> 1.25).
    uint256 private constant DISPLAY_SCALE_DIVISOR = 1e16;

    // --- Time Control ---
    uint256 private constant UPDATE_INTERVAL = 100;

    // --- Rate Boundaries (Stored values in RAY) ---
    // Minimum actual conversion rate is 0.5. Stored value: 0.5 * RAY.
    uint256 private constant MIN_RATE_STORED = 500000000000000000;
    // Maximum actual conversion rate is 2.0. Stored value: 2.0 * RAY.
    uint256 private constant MAX_RATE_STORED = 2000000000000000000;

    // The total width of the allowed range (2.0 RAY - 0.5 RAY = 1.5 RAY)
    uint256 private constant RATE_RANGE_WIDTH =
        MAX_RATE_STORED - MIN_RATE_STORED;

    // --- State Variables ---
    // Public for easy debugging access.
    uint256 public currentConversionRate;
    uint256 private rateSeed; // Used to seed the pseudo-random number generation
    uint256 private lastUpdateTime;

    // --- Access Control ---
    address public owner;

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

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        owner = msg.sender;
        currentConversionRate = RAY; // Start at 1.0x conversion rate (1e18)
        rateSeed = block.timestamp;
        lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Performs the fixed-point multiplication and division for conversion.
     */
    function _convertAmount(
        uint256 amount,
        uint256 rate
    ) internal pure returns (uint256) {
        uint256 converted = (amount * rate) / RAY;
        require(converted > 0, "Conversion resulted in zero tokens.");
        return converted;
    }

    function buyMMFTokenWithExchangeRate(
        address sender,
        address recipient,
        uint256 amountA
    ) public {
        // This call updates the rate and uses the resulting currentConversionRate
        refreshAndGetExchangeRate();

        uint256 convertedAmountA = _convertAmount(
            amountA,
            currentConversionRate
        );

        bool approvedA = IERC20(tokenA).forceApprove(
            sender,
            address(this),
            convertedAmountA
        );
        require(
            approvedA,
            "Swap: TokenA forceApprove failed or not authorized"
        );

        bool approvedB = IERC20(tokenB).forceApprove(
            recipient,
            address(this),
            amountA
        );
        require(
            approvedB,
            "Swap: TokenB forceApprove failed or not authorized"
        );
        // success
        bool successA = IERC20(tokenA).transferFrom(
            sender,
            recipient,
            convertedAmountA
        );
        require(successA, "TokenA transferFrom failed");

        bool successB = IERC20(tokenB).transferFrom(recipient, sender, amountA);
        require(successB, "TokenB transferFrom failed");

        positions[msg.sender].balanceB += amountA;
        positions[msg.sender].lastUpdate = block.timestamp;
    }

    /**
     * @notice Returns the converted amount of MMF to Cash Tokens using the CURRENT stored rate.
     */
    function convertMMFToCashTokens() public view returns (uint256) {
        uint256 amountA = 3000000000000000000;
        uint256 convertedAmountA = _convertAmount(
            amountA,
            currentConversionRate
        );
        return convertedAmountA;
    }

    function redeemMMFTokenWithExchangeRate(
        address sender,
        address recipient,
        uint256 amountA
    ) public {
        refreshAndGetExchangeRate(); // Updates the rate (if time elapsed)

        uint256 convertedAmountA = _convertAmount(
            amountA,
            currentConversionRate
        );

        //Need to tweak tokenA and tokenB context swap as the contract is in the reverse order of constructor parameters
        bool approvedA = IERC20(tokenB).forceApprove(
            sender,
            address(this),
            amountA
        );
        require(
            approvedA,
            "Swap: TokenB forceApprove failed or not authorized"
        );

        bool approvedB = IERC20(tokenA).forceApprove(
            recipient,
            address(this),
            convertedAmountA
        );
        require(
            approvedB,
            "Swap: TokenA forceApprove failed or not authorized"
        );
        // success
        bool successA = IERC20(tokenB).transferFrom(sender, recipient, amountA);
        require(successA, "TokenB transferFrom failed");

        bool successB = IERC20(tokenA).transferFrom(
            recipient,
            sender,
            convertedAmountA
        );
        require(successB, "TokenA transferFrom failed");
    }

    /**
     * @notice Generates a pseudo-random number by hashing only simple, changing state.
     * @dev Significantly simplified for debugging purposes.
     */
    function _generatePseudoRandom() internal view returns (uint256) {
        // Hashing the current block info + the last generated seed for a new value
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        rateSeed, // The state variable that changes on every update
                        msg.sender
                    )
                )
            );
    }

    /**
     * @notice Updates the conversion rate randomly within the 0.50 to 2.00 range.
     * @dev This function now forces an update on every transaction for debugging.
     * @return scaledRate The conversion rate scaled by 100 (e.g., 125 means 1.25).
     */
    function refreshAndGetExchangeRate() public returns (uint256) {
        uint256 oldRate = currentConversionRate;

        // --- 1. Interval Check: If cooldown hasn't passed, return current rate. ---
        if (block.timestamp < lastUpdateTime + UPDATE_INTERVAL) {
            // Return current rate scaled for display (e.g., 1.25 RAY -> 125)
            return currentConversionRate / DISPLAY_SCALE_DIVISOR;
        }

        // --- 2. Generate New Rate ---
        uint256 rand = _generatePseudoRandom();

        // Random position within the total 1.5 RAY width (0 to 1.5 * RAY)
        uint256 rateOffset = rand % RATE_RANGE_WIDTH;

        // New rate is: MIN_RATE_STORED (0.5 RAY) + random offset (0 to 1.5 RAY)
        // Guaranteed to be between 0.5 RAY and 2.0 RAY.
        uint256 finalRate = MIN_RATE_STORED + rateOffset;

        // --- 3. Update State ---
        currentConversionRate = finalRate;
        rateSeed = rand; // Update the seed for the next transaction
        lastUpdateTime = block.timestamp;

        emit ConversionRateUpdated(
            oldRate,
            currentConversionRate,
            block.timestamp,
            msg.sender
        );

        // --- 4. Return Scaled Conversion Rate ---
        return currentConversionRate / DISPLAY_SCALE_DIVISOR;
    }

    /**
     * @notice Returns the timestamp of the last successful rate update.
     */
    function getLastUpdateTime() public view returns (uint256) {
        return lastUpdateTime;
    }

    /**
     * @notice Returns the fixed update interval in seconds.
     */
    function getUpdateInterval() public pure returns (uint256) {
        return UPDATE_INTERVAL;
    }

    function executeTrade(
        address sender,
        address recipient,
        uint256 amountA
    ) public returns (string) {
        uint256 currentRate = refreshAndGetExchangeRate();
        if (currentRate > 1) {
            buyMMFTokenWithExchangeRate(sender, recipient, amountA);
        }
        if (currentRate < 1) {
            redeemMMFTokenWithExchangeRate(sender, recipient, amountA);
        }
    }
}
