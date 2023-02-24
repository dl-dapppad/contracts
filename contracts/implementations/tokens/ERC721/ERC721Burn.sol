// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "./extensions/ERC721Base.sol";
import "../../../extensions/UUPSOwnable.sol";

contract ERC721Burn is UUPSOwnable, ERC721Base, ERC721BurnableUpgradeable {
    function ERC721Burn_init(string memory name_, string memory symbol_) public initializer {
        __UUPSOwnable_init();
        __ERC721_init(name_, symbol_);
        __ERC721Burnable_init();
    }

    function safeMint(address to_, uint256 tokenId_) external onlyOwner {
        super._safeMint(to_, tokenId_);
    }

    function mint(address to_, uint256 tokenId_) external onlyOwner {
        super._mint(to_, tokenId_);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        baseURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}
