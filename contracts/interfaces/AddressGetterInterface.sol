pragma solidity ^0.6.0;

interface AddressGetterInterface {
  /**
   * @dev verifySignerHasAuthority
   * @notice Verifies that the given signer address has authority over the
   * contract address.
   * @param contractAddress - The address of a compliant smart wallet.
   * @param signerAddress - An address to check for authority over the contract.
   * @return Boolean stating whether the signer has authority over the contract
   * address.
   */
  function verifySignerHasAuthority(
    address contractAddress, address signerAddress
  ) external view returns (bool);

  /**
   * @dev getContractAddressForSigner
   * @notice Returns the contract address derived from the signer address or
   * queried in some mapping.
   * @param signerAddress The input address to get a contract address for.
   * @return Address of the contract for the signer.
   */
  function getContractAddressForSigner(
    address signerAddress
  ) external view returns (address);
}