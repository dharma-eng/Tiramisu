# [🔗](contracts/interfaces/IERC20.sol#L3) IERC20

Interface of the ERC20 standard as defined in the EIP.

# Functions

## [🔗](contracts/interfaces/IERC20.sol#L23) `transfer(address recipient, uint256 amount)`

Moves `amount` tokens from the caller's account to `recipient`.

Returns a boolean value indicating whether the operation succeeded.

Emits a {Transfer} event.

### Parameters

- `recipient`
- `amount`

### Returns

- `bool`

## [🔗](contracts/interfaces/IERC20.sol#L34) `approve(address spender, uint256 amount)`

Sets `amount` as the allowance of `spender` over the caller's tokens.

Returns a boolean value indicating whether the operation succeeded.

IMPORTANT: Beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:

https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729 Emits an {Approval} event.

### Parameters

- `spender`
- `amount`

### Returns

- `bool`

## [🔗](contracts/interfaces/IERC20.sol#L51) `transferFrom(address sender, address recipient, uint256 amount)`

Moves `amount` tokens from `sender` to `recipient` using the allowance mechanism. `amount` is then deducted from the caller's allowance.

Returns a boolean value indicating whether the operation succeeded.

Emits a {Transfer} event.

### Parameters

- `sender`
- `recipient`
- `amount`

### Returns

- `bool`

## [🔗](contracts/interfaces/IERC20.sol#L64) `totalSupply()`

Returns the amount of tokens in existence.

### Returns

- `uint256`

## [🔗](contracts/interfaces/IERC20.sol#L69) `balanceOf(address account)`

Returns the amount of tokens owned by `account`.

### Parameters

- `account`

### Returns

- `uint256`

## [🔗](contracts/interfaces/IERC20.sol#L74) `allowance(address owner, address spender)`

Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner` through {transferFrom}. This is zero by default.

This value changes when {approve} or {transferFrom} are called.

### Parameters

- `owner`
- `spender`

### Returns

- `uint256`
