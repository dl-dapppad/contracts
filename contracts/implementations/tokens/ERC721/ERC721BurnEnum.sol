// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "./extensions/ERC721Base.sol";
import "../../../extensions/UUPSOwnable.sol";

contract ERC721BurnEnum is
    UUPSOwnable,
    ERC721Base,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable
{
    function ERC721BurnEnum_init(string memory name_, string memory symbol_) public initializer {
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

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (bool) {
        return
            interfaceId == type(IERC721Upgradeable).interfaceId ||
            interfaceId == type(IERC721MetadataUpgradeable).interfaceId ||
            interfaceId == type(IERC721EnumerableUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from_,
        address to_,
        uint256 tokenId_,
        uint256 batchSize_
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        ERC721EnumerableUpgradeable._beforeTokenTransfer(from_, to_, tokenId_, batchSize_);
    }
}
