# [🔗](/contracts/mocks/MockDharmaDai.sol#L5) SafeMath

Wrappers over Solidity's arithmetic operations with added overflow checks.

Arithmetic operations in Solidity wrap on overflow. This can easily result in bugs, because programmers usually assume that an overflow raises an error, which is the standard behavior in high level programming languages.

`SafeMath` restores this intuition by reverting the transaction when an operation overflows.

Using this library instead of the unchecked operations eliminates an entire class of bugs, so it's recommended to use it always.

# Functions

## [🔗](/contracts/mocks/MockDharmaDai.sol#L19) `add(uint256 a, uint256 b)`

Returns the addition of two unsigned integers, reverting on overflow.

Counterpart to Solidity's `+` operator.

Requirements:

- Addition cannot overflow.

### Parameters

- `a`
- `b`

### Returns

- `uint256`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L35) `sub(uint256 a, uint256 b, string errorMessage)`

Returns the subtraction of two unsigned integers, reverting with custom message on overflow (when the result is negative).

Counterpart to Solidity's `-` operator.

Requirements:

- Subtraction cannot overflow.

### Parameters

- `a`
- `b`
- `errorMessage`

### Returns

- `uint256`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L109) `freeCoins(address recipient, uint256 amount)`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L113) `transfer(address recipient, uint256 amount)`

See {IERC20-transfer}.

Requirements:

- `recipient` cannot be the zero address.

- the caller must have a balance of at least `amount`.

### Parameters

- `recipient`
- `amount`

### Returns

- `bool`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L128) `approve(address spender, uint256 amount)`

See {IERC20-approve}.

Requirements:

- `spender` cannot be the zero address.

### Parameters

- `spender`
- `amount`

### Returns

- `bool`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L142) `transferFrom(address sender, address recipient, uint256 amount)`

See {IERC20-transferFrom}.

Emits an {Approval} event indicating the updated allowance. This is not required by the EIP. See the note at the beginning of {ERC20}; Requirements:

- `sender` and `recipient` cannot be the zero address.

- `sender` must have a balance of at least `amount`.

- the caller must have allowance for `sender`'s tokens of at least `amount`.

### Parameters

- `sender`
- `recipient`
- `amount`

### Returns

- `bool`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L168) `increaseAllowance(address spender, uint256 addedValue)`

Atomically increases the allowance granted to `spender` by the caller.

This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}.

Emits an {Approval} event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.

### Parameters

- `spender`
- `addedValue`

### Returns

- `bool`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L190) `decreaseAllowance(address spender, uint256 subtractedValue)`

Atomically decreases the allowance granted to `spender` by the caller.

This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}.

Emits an {Approval} event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.

- `spender` must have allowance for the caller of at least `subtractedValue`.

### Parameters

- `spender`
- `subtractedValue`

### Returns

- `bool`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L216) `name()`

Returns the name of the token.

### Returns

- `string`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L223) `symbol()`

Returns the symbol of the token, usually a shorter version of the name.

### Returns

- `string`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L231) `decimals()`

Returns the number of decimals used to get its user representation.

For example, if `decimals` equals `2`, a balance of `505` tokens should be displayed to a user as `5,05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between Ether and Wei. This is the value {ERC20} uses.

NOTE: This information is only used for _display_ purposes: it in no way affects any of the arithmetic of the contract, including {IERC20-balanceOf} and {IERC20-transfer}.

### Returns

- `uint8`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L247) `totalSupply()`

See {IERC20-totalSupply}.

### Returns

- `uint256`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L254) `balanceOf(address account)`

See {IERC20-balanceOf}.

### Parameters

- `account`

### Returns

- `uint256`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L261) `allowance(address owner, address spender)`

See {IERC20-allowance}.

### Parameters

- `owner`
- `spender`

### Returns

- `uint256`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L270) `_transfer(address sender, address recipient, uint256 amount)`

Moves tokens `amount` from `sender` to `recipient`.

This is internal function is equivalent to {transfer}, and can be used to e.g. implement automatic token fees, slashing mechanisms, etc.

Emits a {Transfer} event.

Requirements:

- `sender` cannot be the zero address.

- `recipient` cannot be the zero address.

- `sender` must have a balance of at least `amount`.

### Parameters

- `sender`
- `recipient`
- `amount`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L303) `_mint(address account, uint256 amount)`

Creates `amount` tokens and assigns them to `account`, increasing the total supply.

Emits a {Transfer} event with `from` set to the zero address.

Requirements

- `to` cannot be the zero address.

### Parameters

- `account`
- `amount`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L320) `_burn(address account, uint256 amount)`

Destroys `amount` tokens from `account`, reducing the total supply.

Emits a {Transfer} event with `to` set to the zero address.

Requirements

- `account` cannot be the zero address.

- `account` must have at least `amount` tokens.

### Parameters

- `account`
- `amount`

## [🔗](/contracts/mocks/MockDharmaDai.sol#L345) `_approve(address owner, address spender, uint256 amount)`

Sets `amount` as the allowance of `spender` over the `owner`s tokens.

This is internal function is equivalent to `approve`, and can be used to e.g. set automatic allowances for certain subsystems, etc.

Emits an {Approval} event.

Requirements:

- `owner` cannot be the zero address.

- `spender` cannot be the zero address.

### Parameters

- `owner`
- `spender`
- `amount`
