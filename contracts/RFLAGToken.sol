// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// ... (skipping documentation header modifications, keeping it simple)

contract RFLAGToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public constant COMMUNITY_ALLOCATION = 40_000_000 * 10**18; // 40M for rewards

    // Reward amounts (in RFLAG, 18 decimals)
    uint256 public constant REWARD_VERIFY_PROFILE    = 50  * 10**18;
    uint256 public constant REWARD_CONFIRM_REPORT    = 100 * 10**18;
    uint256 public constant REWARD_MATCH_7DAYS       = 25  * 10**18;
    uint256 public constant REWARD_USE_SAFERIDE      = 10  * 10**18;
    uint256 public constant REWARD_DAILY_CHECKIN     = 5   * 10**18;

    // Spend amounts
    uint256 public constant SPEND_PREMIUM_MONTH      = 500 * 10**18;
    uint256 public constant SPEND_BOOST_PROFILE      = 50  * 10**18;
    uint256 public constant SPEND_PRIORITY_SUPPORT   = 100 * 10**18;

    // Track total community rewards minted
    uint256 public communityMinted;

    // Addresses authorized to call rewardUser (our backend wallet)
    mapping(address => bool) public rewarders;

    // Daily check-in cooldown
    mapping(address => uint256) public lastCheckin;
    uint256 public constant CHECKIN_COOLDOWN = 24 hours;

    // Track if user already claimed profile verification reward
    mapping(address => bool) public hasClaimedVerifyReward;

    // Events
    event Rewarded(address indexed user, uint256 amount, string reason);
    event Spent(address indexed user, uint256 amount, string reason);
    event RewarderSet(address indexed addr, bool authorized);

    modifier onlyRewarder() {
        require(rewarders[msg.sender] || msg.sender == owner(), "Not authorized rewarder");
        _;
    }

    constructor() ERC20("RedFlag Token", "RFLAG") Ownable(msg.sender) {
        // Mint 60% to owner at deploy (team + ecosystem + liquidity)
        uint256 initialMint = MAX_SUPPLY - COMMUNITY_ALLOCATION;
        _mint(msg.sender, initialMint);
    }

    // ─── ADMIN ────────────────────────────────────────────────

    function setRewarder(address addr, bool authorized) external onlyOwner {
        rewarders[addr] = authorized;
        emit RewarderSet(addr, authorized);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── REWARD ENGINE ────────────────────────────────────────

    function rewardUser(address user, uint256 amount, string calldata reason)
        external onlyRewarder nonReentrant whenNotPaused
    {
        require(communityMinted + amount <= COMMUNITY_ALLOCATION, "Community allocation exhausted");
        communityMinted += amount;
        _mint(user, amount);
        emit Rewarded(user, amount, reason);
    }

    function claimDailyCheckin() external nonReentrant whenNotPaused {
        require(
            block.timestamp >= lastCheckin[msg.sender] + CHECKIN_COOLDOWN,
            "Already checked in today"
        );
        require(
            communityMinted + REWARD_DAILY_CHECKIN <= COMMUNITY_ALLOCATION,
            "Community allocation exhausted"
        );
        lastCheckin[msg.sender] = block.timestamp;
        communityMinted += REWARD_DAILY_CHECKIN;
        _mint(msg.sender, REWARD_DAILY_CHECKIN);
        emit Rewarded(msg.sender, REWARD_DAILY_CHECKIN, "daily_checkin");
    }

    // ─── SPEND / BURN FUNCTIONS ──────────────────────────────

    function spendPremium() external nonReentrant whenNotPaused {
        _spendTokens(msg.sender, SPEND_PREMIUM_MONTH, "premium_monthly");
    }

    function spendBoost() external nonReentrant whenNotPaused {
        _spendTokens(msg.sender, SPEND_BOOST_PROFILE, "profile_boost");
    }

    function spendPrioritySupport() external nonReentrant whenNotPaused {
        _spendTokens(msg.sender, SPEND_PRIORITY_SUPPORT, "priority_support");
    }

    function _spendTokens(address user, uint256 amount, string memory reason) internal {
        require(balanceOf(user) >= amount, "Insufficient RFLAG balance");
        _burn(user, amount);
        emit Spent(user, amount, reason);
    }

    // Override the core openzeppelin _update function to pause token transfers entirely (v5)
    // For earlier limits, whenNotPaused covers our main flows.
    // Assuming v5 ERC20 _update format:
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }

    // ─── VIEW ─────────────────────────────────────────────────

    function remainingCommunityAllocation() external view returns (uint256) {
        return COMMUNITY_ALLOCATION - communityMinted;
    }

    function canCheckin(address user) external view returns (bool, uint256 nextCheckin) {
        nextCheckin = lastCheckin[user] + CHECKIN_COOLDOWN;
        return (block.timestamp >= nextCheckin, nextCheckin);
    }
}
    function remainingCommunityAllocation() external view returns (uint256) {
        return COMMUNITY_ALLOCATION - communityMinted;
    }

    function canCheckin(address user) external view returns (bool, uint256 nextCheckin) {
        nextCheckin = lastCheckin[user] + CHECKIN_COOLDOWN;
        return (block.timestamp >= nextCheckin, nextCheckin);
    }
}
