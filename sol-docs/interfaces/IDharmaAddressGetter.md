# [🔗](/contracts/interfaces/IDharmaAddressGetter.sol#L3) IDharmaAddressGetter
# Functions
## [🔗](/contracts/interfaces/IDharmaAddressGetter.sol#L4) `verifySignerHasAuthority(address contractAddress, address signerAddress)`

verifySignerHasAuthority

Verifies that the given signer address has authority over the contract address.




### Parameters
* `contractAddress` - The address of a Dharma smart wallet.
* `signerAddress` - An address to check for authority over the contract.
### Returns
* `bool` Boolean stating whether the signer has authority over the contract address.

## [🔗](/contracts/interfaces/IDharmaAddressGetter.sol#L15) `getContractAddressForSigner(address signerAddress)`

getContractAddressForSigner

Returns the Dharma contract address derived from the signer address or queried in some mapping.




### Parameters
* `signerAddress` The input address to get a contract address for.
### Returns
* `address` Address of the Dharma contract for the signer.

