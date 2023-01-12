// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "./extensions/ERC721Base.sol";
import "../../../extensions/UUPSBase.sol";

contract ERC721Enum is UUPSBase, ERC721Base, ERC721EnumerableUpgradeable {
    function ERC721Enum_init(string memory name_, string memory symbol_) public initializer {
        __UUPSBase_init();
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
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
