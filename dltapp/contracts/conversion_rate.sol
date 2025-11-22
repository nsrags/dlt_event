//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ConversionRate {

    // Scaling factor (10^18) for fixed-point math, representing 1.0 unit.
    uint256 private constant RAY = 1e18;

    // The divisor used to scale the 18-decimal RAY value down to an integer
    // with 2 decimal places of precision (18 - 2 = 16 decimals to remove).
    // Client must divide the result by 100 to get the float (e.g., 125 -> 1.25).
    uint256 private constant DISPLAY_SCALE_DIVISOR = 1e16;

    // --- Time Control ---
    uint256 private constant UPDATE_INTERVAL = 10;

    // --- Rate Boundaries (Stored values in RAY) ---
    // Minimum actual conversion rate is 0.5. Stored value: 0.5 * RAY.
    uint256 private constant MIN_RATE_STORED = 500000000000000000;
    // Maximum actual conversion rate is 2.0. Stored value: 2.0 * RAY.
    uint256 private constant MAX_RATE_STORED = 2000000000000000000;

    // The total width of the allowed range (2.0 RAY - 0.5 RAY = 1.5 RAY)
    uint256 private constant RATE_RANGE_WIDTH = MAX_RATE_STORED - MIN_RATE_STORED;

    // --- State Variables ---
    // Public for easy debugging access.
    uint256 public currentConversionRate;
    uint256 private rateSeed; // Used to seed the pseudo-random number generation
    uint256 private lastUpdateTime;

    // --- Events ---
    event ConversionRateUpdated(uint256 oldRate, uint256 newRate, uint256 newTimestamp, address indexed updater);

    constructor() {
        currentConversionRate = RAY; // Start at 1.0x conversion rate (1e18)
        rateSeed = block.timestamp;
        lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Generates a pseudo-random number by hashing only simple, changing state.
     * @dev Significantly simplified for debugging purposes.
     */
    function _generatePseudoRandom() internal view returns (uint256) {
        // Hashing the current block info + the last generated seed for a new value
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            rateSeed, // The state variable that changes on every update
            msg.sender
        )));
    }

    /**
     * @notice Updates the conversion rate randomly within the 0.50 to 2.00 range.
     * @dev This function now forces an update on every transaction for debugging.
     * @return scaledRate The conversion rate scaled by 100 (e.g., 125 means 1.25).
     */
    function refreshAndGetConversionRate() public returns (uint256) {
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

        emit ConversionRateUpdated(oldRate, currentConversionRate, block.timestamp, msg.sender);

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
}
