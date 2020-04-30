pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import { MerkleTreeLib as Merkle } from "./merkle/MerkleTreeLib.sol";


library TransactionsLib {
  enum TransactionType {
    HARD_CREATE,
    HARD_DEPOSIT,
    HARD_WITHDRAW,
    HARD_ADD_SIGNER,
    SOFT_WITHDRAW,
    SOFT_CREATE,
    SOFT_TRANSFER,
    SOFT_CHANGE_SIGNER
  }

  struct TransactionsMetadata {
    uint16 hardCreateCount;
    uint16 hardDepositCount;
    uint16 hardWithdrawCount;
    uint16 hardAddSignerCount;
    uint16 softWithdrawCount;
    uint16 softCreateCount;
    uint16 softTransferCount;
    uint16 softChangeSignerCount;
  }

  struct HardCreate {
    uint40 hardTransactionIndex;
    uint32 accountIndex;
    uint56 value;
    address contractAddress;
    address signerAddress;
    bytes32 root;
  }

  struct HardDeposit {
    uint40 hardTransactionIndex;
    uint32 accountIndex;
    uint56 value;
    bytes32 root;
  }

  struct HardWithdrawal {
    uint40 hardTransactionIndex;
    uint32 accountIndex;
    address withdrawalAddress;
    uint56 value;
    bytes32 intermediateStateRoot;
  }

  struct HardAddSigner {
    uint40 hardTransactionIndex;
    uint32 accountIndex;
    address signingAddress;
    bytes32 intermediateStateRoot;
  }

  struct SoftWithdrawal {
    uint24 nonce;
    uint32 accountIndex;
    address withdrawalAddress;
    uint56 value;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;
  }

  struct SoftCreate {
    uint24 nonce;
    uint32 fromIndex;
    uint32 toIndex;
    uint56 value;
    address contractAddress;
    address signingAddress;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;
  }

  struct SoftTransfer {
    uint24 nonce;
    uint32 fromIndex;
    uint32 toIndex;
    uint56 value;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;
  }

  struct SoftChangeSigner {
    uint24 nonce;
    uint32 fromIndex;
    address signingAddress;
    uint8 modificationCategory;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;
  }

  function decodeHardCreate(
    bytes memory transaction
  ) internal pure returns (HardCreate memory hardCreate) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // hardTransactionIndex: [no offset] [40 bits]  (load(0) >> 216)
      mstore(hardCreate, shr(216, mload(bodyPtr)))
      // accountIndex: [offset 5 bytes] [32 bits]  (load(5) >> 224)
      mstore(add(hardCreate, 0x20), shr(224, mload(add(bodyPtr, 5))))
      // value: [offset 9 bytes] [56 bits]  (load(9) >> 200)
      mstore(add(hardCreate, 0x40), shr(200, mload(add(bodyPtr, 9))))
      // contractAddress: [offset 16 bytes] [160 bits]  (load(16) >> 96)
      mstore(add(hardCreate, 0x60), shr(96, mload(add(bodyPtr, 16))))
      // signerAddress: [offset 36 bytes] [160 bits]  (load(36) >> 96)
      mstore(add(hardCreate, 0x80), shr(96, mload(add(bodyPtr, 36))))
      // intermediateStateRoot: [offset 56 bytes] [256 bits] (load(56))
      mstore(add(hardCreate, 0xa0), mload(add(bodyPtr, 56)))
    }
  }

  function decodeHardDeposit(
    bytes memory transaction
  ) internal pure returns (HardDeposit memory hardDeposit) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // hardTransactionIndex: [no offset] [40 bits]  (load(0) >> 216)
      mstore(hardDeposit, shr(216, mload(bodyPtr)))
      // accountIndex: [offset 5 bytes] [32 bits]  (load(5) >> 224)
      mstore(add(hardDeposit, 0x20), shr(224, mload(add(bodyPtr, 5))))
      // value: [offset 9 bytes] [56 bits]  (load(9) >> 200)
      mstore(add(hardDeposit, 0x40), shr(200, mload(add(bodyPtr, 9))))
      // intermediateStateRoot: [offset 56 bytes] [256 bits] (load(16))
      mstore(add(hardDeposit, 0x60), mload(add(bodyPtr, 16)))
    }
  }

  function decodeHardWithdrawal(
    bytes memory transaction
  ) internal pure returns (HardWithdrawal memory hardWithdrawal) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // hardTransactionIndex: [no offset] [40 bits]  (load(0) >> 216)
      mstore(hardWithdrawal, shr(216, mload(bodyPtr)))
      // accountIndex: [offset 5 bytes] [32 bits]  (load(5) >> 224)
      mstore(add(hardWithdrawal, 0x20), shr(224, mload(add(bodyPtr, 5))))
      // withdrawalAddress: [offset 9 bytes] [160 bits]  (load(9) >> 96)
      mstore(add(hardWithdrawal, 0x40), shr(96, mload(add(bodyPtr, 9))))
      // value: [offset 29 bytes] [56 bits]  (load(9) >> 200)
      mstore(add(hardWithdrawal, 0x60), shr(200, mload(add(bodyPtr, 29))))
      // intermediateStateRoot: [offset 36 bytes] [256 bits] (load(16))
      mstore(add(hardWithdrawal, 0x80), mload(add(bodyPtr, 36)))
    }
  }

  function decodeHardAddSigner(
    bytes memory transaction
  ) internal pure returns (HardAddSigner memory hardAddSigner) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // hardTransactionIndex: [no offset] [40 bits]  (load(0) >> 216)
      mstore(hardAddSigner, shr(216, mload(bodyPtr)))
      // accountIndex: [offset 5 bytes] [32 bits]  (load(5) >> 224)
      mstore(add(hardAddSigner, 0x20), shr(224, mload(add(bodyPtr, 5))))
      // withdrawalAddress: [offset 9 bytes] [160 bits]  (load(9) >> 96)
      mstore(add(hardAddSigner, 0x40), shr(96, mload(add(bodyPtr, 9))))
      // signerAddress: [offset 29 bytes] [160 bits]  (load(29) >> 96)
      mstore(add(hardAddSigner, 0x60), shr(96, mload(add(bodyPtr, 29))))
      // intermediateStateRoot: [offset 49 bytes] [256 bits] (load(49))
      mstore(add(hardAddSigner, 0x80), mload(add(bodyPtr, 49)))
    }
  }

  function decodeSoftWithdrawal(
    bytes memory transaction
  ) internal pure returns (SoftWithdrawal memory softWithdrawal) {
    uint24 nonce;
    uint32 accountIndex;
    address withdrawalAddress;
    uint56 value;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;

    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)

      nonce := shr(232, mload(bodyPtr))
      accountIndex := shr(224, mload(add(bodyPtr, 3)))
      withdrawalAddress := shr(96, mload(add(bodyPtr, 7)))
      value := shr(200, mload(add(bodyPtr, 27)))
      sigV := shr(248, mload(add(bodyPtr, 34)))
      sigR := mload(add(bodyPtr, 35))
      sigS := mload(add(bodyPtr, 67))
      intermediateStateRoot := mload(add(bodyPtr, 99))
    }

    softWithdrawal = SoftWithdrawal(
      nonce,
      accountIndex,
      withdrawalAddress,
      value,
      sigV,
      sigR,
      sigS,
      intermediateStateRoot
    );
  }

  function decodeSoftCreate(
    bytes memory transaction
  ) internal pure returns (SoftCreate memory softCreate) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      let writePtr := softCreate
      // nonce: [no offset] [24 bits]  (load(0) >> 232)
      mstore(softCreate, shr(232, mload(bodyPtr)))
      // fromIndex: [offset 3 bytes] [32 bits]  (load(3) >> 224)
      mstore(add(softCreate, 0x20), shr(224, mload(add(bodyPtr, 3))))
      // toIndex: [offset 7 bytes] [32 bits]  (load(7) >> 224)
      mstore(add(softCreate, 0x40), shr(224, mload(add(bodyPtr, 7))))
      // value: [offset 11 bytes] [56 bits]  (load(11) >> 200)
      mstore(add(softCreate, 0x60), shr(200, mload(add(bodyPtr, 11))))
      // contractAddress: [offset 18 bytes] [160 bits]  (load(18) >> 96)
      mstore(add(softCreate, 0x80), shr(96, mload(add(bodyPtr, 18))))
      // signingAddress: [offset 38 bytes] [160 bits]  (load(38) >> 96)
      mstore(add(softCreate, 0xa0), shr(96, mload(add(bodyPtr, 38))))
      // sigV: [offset 58 bytes] [8 bits]  (load(58) >> 248)
      mstore(add(softCreate, 0xa0), shr(248, mload(add(bodyPtr, 58))))
      // sigR: [offset 59 bytes] [256 bits]  (load(59))
      mstore(add(softCreate, 0xc0), mload(add(bodyPtr, 59)))
      // sigS: [offset 91 bytes] [256 bits]  (load(91))
      mstore(add(softCreate, 0xe0), mload(add(bodyPtr, 91)))
      // intermediateStateRoot: [offset 123 bytes] [256 bits] (load(123))
      mstore(add(softCreate, 0x100), mload(add(bodyPtr, 123)))
    }
  }

  function decodeSoftTransfer(
    bytes memory transaction
  ) internal pure returns (SoftTransfer memory softTransfer) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // nonce: [no offset] [24 bits]  (load(0) >> 232)
      mstore(softTransfer, shr(232, mload(bodyPtr)))
      // fromIndex: [offset 3 bytes] [32 bits]  (load(3) >> 224)
      mstore(add(softTransfer, 0x20), shr(224, mload(add(bodyPtr, 3))))
      // toIndex: [offset 7 bytes] [32 bits]  (load(7) >> 224)
      mstore(add(softTransfer, 0x40), shr(224, mload(add(bodyPtr, 7))))
      // value: [offset 11 bytes] [56 bits]  (load(11) >> 200)
      mstore(add(softTransfer, 0x60), shr(200, mload(add(bodyPtr, 11))))
      // sigV: [offset 18 bytes] [8 bits]  (load(18) >> 248)
      mstore(add(softTransfer, 0x80), shr(248, mload(add(bodyPtr, 18))))
      // sigR: [offset 19 bytes] [256 bits]  (load(19))
      mstore(add(softTransfer, 0xa0), mload(add(bodyPtr, 19)))
      // sigS: [offset 51 bytes] [256 bits]  (load(51))
      mstore(add(softTransfer, 0xc0), mload(add(bodyPtr, 51)))
      // intermediateStateRoot: [offset 83 bytes] [256 bits] (load(83))
      mstore(add(softTransfer, 0xe0), mload(add(bodyPtr, 83)))
    }
  }

  function decodeSoftChangeSigner(
    bytes memory transaction
  ) internal pure returns (SoftChangeSigner memory softChangeSigner) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(transaction, 0x21)
      // nonce: [no offset] [24 bits]  (load(0) >> 232)
      mstore(softChangeSigner, shr(232, mload(bodyPtr)))
      // fromIndex: [offset 3 bytes] [32 bits]  (load(3) >> 224)
      mstore(add(softChangeSigner, 0x20), shr(224, mload(add(bodyPtr, 3))))
      // signingAddress: [offset 7 bytes] [160 bits] (load(7) >> 96)
      mstore(add(softChangeSigner, 0x40), shr(96, mload(add(bodyPtr, 7))))
      // modificationCategory: [offset 27 bytes] [8 bits]  (load(27) >> 248)
      mstore(add(softChangeSigner, 0x60), shr(248, mload(add(bodyPtr, 27))))
      // sigV: [offset 28 bytes] [8 bits]  (load(28) >> 248)
      mstore(add(softChangeSigner, 0x80), shr(248, mload(add(bodyPtr, 28))))
      // sigR: [offset 29 bytes] [256 bits]  (load(29))
      mstore(add(softChangeSigner, 0xa0), mload(add(bodyPtr, 29)))
      // sigS: [offset 61 bytes] [256 bits]  (load(61))
      mstore(add(softChangeSigner, 0xc0), mload(add(bodyPtr, 61)))
      // intermediateStateRoot: [offset 93 bytes] [256 bits] (load(93))
      mstore(add(softChangeSigner, 0xe0), mload(add(bodyPtr, 93)))
    }
  }

  /**
   * @dev decodeTransactionsMetadata
   * Decodes the first 16 bytes of a block's transactions buffer into a metadata struct.
   * @param transactions - transactions buffer from a block
   * @return meta - decoded metadata object
   */
  function decodeTransactionsMetadata(
    bytes memory transactions
  ) internal pure returns (TransactionsMetadata memory meta) {
    assembly {
      let ptr := add(transactions, 32)
      /* hardCreateCount */
      mstore(meta, shr(240, mload(ptr)))
      /* hardDepositCount */
      mstore(add(meta, 32), shr(240, mload(add(ptr, 2))))
      /* hardWithdrawCount */
      mstore(add(meta, 64), shr(240, mload(add(ptr, 4))))
      /* hardAddSignerCount */
      mstore(add(meta, 96), shr(240, mload(add(ptr, 6))))
      /* softWithdrawCount */
      mstore(add(meta, 128), shr(240, mload(add(ptr, 8))))
      /* softCreateCount */
      mstore(add(meta, 160), shr(240, mload(add(ptr, 10))))
      /* softTransferCount */
      mstore(add(meta, 192), shr(240, mload(add(ptr, 12))))
      /* softChangeSignerCount */
      mstore(add(meta, 224), shr(240, mload(add(ptr, 14))))
    }
  }

  /**
   * @dev stateRootFromTransaction
   * Reads the state root from a transaction by peeling off the last 32 bytes.
   * @param transaction - encoded transaction of any type
   * @return root - state root from the transaction
   */
  function stateRootFromTransaction(
    bytes memory transaction
  ) internal pure returns (bytes32 root) {
    assembly {
      let inPtr := add(transaction, 32)
      let len := mload(transaction)
      let rootPtr := add(inPtr, sub(len, 32))
      root := mload(rootPtr)
    }
  }

  /**
   * @dev countCreateTransactionsWithEmptyRoot
   * Counts the number of hard create transactions in a transactions buffer which failed to execute.
   * @param txData - transactions buffer from a block
   * @param meta - transactions metadata from the buffer
   * @return count - number of failed create transactions in the block
   */
  function countCreateTransactionsWithEmptyRoot(
    bytes memory txData, TransactionsMetadata memory meta
  ) internal pure returns (uint256 count) {
    uint256 pointer;
    assembly { pointer := add(txData, 48) }
    for (uint256 i = 0; i < meta.hardCreateCount; i++) {
      assembly {
        let root := mload(add(pointer, 56))
        if iszero(root) { count := add(count, 1) }
        pointer := add(pointer, 88)
      }
    }
  }

  /**
   * @dev transactionPrefix
   * Returns the transaction prefix from an encoded transaction by reading the first byte.
   * @param transaction - encoded transaction of any type
   * @return prefix - transaction prefix read from the first byte of the transaction
   */
  function transactionPrefix(
    bytes memory transaction
  ) internal pure returns (uint8 prefix) {
    assembly { prefix := shr(248, mload(add(transaction, 32))) }
  }

  /**
   * @dev transactionsCount
   * Returns the total number of transactions in the tx metadata.
   * @param meta - transactions metadata from a transaction buffer
   * @return number of transactions the metadata says exist in the buffer
   */
  function transactionsCount(
    TransactionsMetadata memory meta
  ) internal pure returns (uint256) {
    return (
      meta.hardCreateCount +
      meta.hardDepositCount +
      meta.hardWithdrawCount +
      meta.hardAddSignerCount +
      meta.softWithdrawCount +
      meta.softCreateCount +
      meta.softTransferCount +
      meta.softChangeSignerCount
    );
  }

  /**
   * @dev expectedTransactionsLength
   * Calculates the expected size of the transactions buffer based on the transactions metadata.
   * @param meta - transactions metadata from a transaction buffer
   * @return number of bytes the transactions buffer should have
   */
  function expectedTransactionsLength(
    TransactionsMetadata memory meta
  ) internal pure returns (uint256) {
    return (
      meta.hardCreateCount * 88 +
      meta.hardDepositCount * 48 +
      meta.hardWithdrawCount * 68 +
      meta.hardAddSignerCount * 61 +
      meta.softWithdrawCount * 131 +
      meta.softCreateCount * 155 +
      meta.softTransferCount * 115 +
      meta.softChangeSignerCount * 125
    );
  }

  function putLeaves(
    bytes[] memory leaves,
    bool identitySuccess,
    uint256 leafIndex,
    uint256 currentPointer,
    uint8 typePrefix,
    uint256 typeCount,
    uint256 typeSize
  ) internal view returns (
    bool _identitySuccess, uint256 _leafIndex, uint256 _currentPointer
  ) {
    for (uint256 i = 0; i < typeCount; i++) {
      bytes memory _tx = new bytes(typeSize + 1);
      assembly {
        let outPtr := add(_tx, 32)
        mstore8(outPtr, typePrefix)
        outPtr := add(outPtr, 1)
        identitySuccess := and(identitySuccess, staticcall(gas(), 0x04, currentPointer, typeSize, outPtr, typeSize))
        currentPointer := add(currentPointer, typeSize)
      }
      leaves[leafIndex++] = _tx;
    }
    return (identitySuccess, leafIndex, currentPointer);
  }

  function deriveTransactionsRoot(
    bytes memory transactionsData
  ) internal view returns (bytes32) {
    TransactionsMetadata memory meta = decodeTransactionsMetadata(
      transactionsData
    );

    uint256 expectedLength = expectedTransactionsLength(meta);
    /* If the transactions data size is incommensurate with the transactions
       header, the block is erroneous. */
    require(
      transactionsData.length == expectedLength + 16,
      "Incorrect transactions data buffer length."
    );
    uint256 txCount = transactionsCount(meta);
    uint256 txPtr;
    uint256 leafIndex = 0;
    assembly { txPtr := add(transactionsData, 48) }
    bool identitySuccess = true;
    bytes[] memory leaves = new bytes[](txCount);
    uint16[2][8] memory elements = [
      [meta.hardCreateCount, 88],
      [meta.hardDepositCount, 48],
      [meta.hardWithdrawCount, 68],
      [meta.hardAddSignerCount, 61],
      [meta.softWithdrawCount, 131],
      [meta.softCreateCount, 155],
      [meta.softTransferCount, 115],
      [meta.softChangeSignerCount, 125]
    ];

    for (uint8 i = 0; i < 8; i++) {
      uint256 count = elements[i][0];
      if (count > 0) {
        (identitySuccess, leafIndex, txPtr) = putLeaves(
          leaves, identitySuccess, leafIndex, txPtr, i, count, elements[i][1]
        );
      }
    }

    require(identitySuccess, "Failed to copy bytes.");
    return Merkle.getMerkleRoot(leaves);
  }
}