// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RedFlagReports is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("RedFlag Reports", "RFR") Ownable(msg.sender) {}

    function mintReport(address to, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
