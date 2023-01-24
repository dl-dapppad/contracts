// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.8.0;

contract UniswapV3FactoryMock {
    address pool;

    function setPool(address pool_) external {
        pool = pool_;
    }

    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address) {
        // Some calculation to prevent warnings
        return
            address(
                uint256(tokenA) +
                    uint256(tokenB) +
                    fee -
                    uint256(tokenA) -
                    uint256(tokenB) -
                    fee +
                    uint256(pool)
            );
    }
}
