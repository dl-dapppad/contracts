// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "./extensions/ERC721Base.sol";
import "../../../extensions/UUPSOwnable.sol";

contract ERC721 is UUPSOwnable, ERC721Base, ERC721Upgradeable {
    function ERC721_init(string memory name_, string memory symbol_) public initializer {
        __UUPSOwnable_init();
        __ERC721_init(name_, symbol_);
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
