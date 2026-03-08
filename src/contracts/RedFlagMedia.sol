// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RedFlagMedia is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("RedFlag Media", "RFM") Ownable(msg.sender) {}

    function mintMedia(address to, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
