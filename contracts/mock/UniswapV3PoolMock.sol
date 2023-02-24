// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.0 <0.8.0;

contract UniswapV3PoolMock {
    int56[] tickCumulativesMock;
    uint160[] secondsPerLiquidityCumulativeX128sMock;

    constructor(
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    ) {
        tickCumulativesMock = tickCumulatives;
        secondsPerLiquidityCumulativeX128sMock = secondsPerLiquidityCumulativeX128s;
    }

    function observe(
        uint32[] calldata secondsAgos
    )
        external
        view
        returns (
            int56[] memory tickCumulatives,
            uint160[] memory secondsPerLiquidityCumulativeX128s,
            uint32[] calldata someVar
        )
    {
        // Some calculation to prevent warnings
        someVar = secondsAgos;

        return (tickCumulativesMock, secondsPerLiquidityCumulativeX128sMock, someVar);
    }
}
