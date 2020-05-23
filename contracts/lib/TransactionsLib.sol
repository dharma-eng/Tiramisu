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
		bytes32 intermediateStateRoot;
	}

	struct HardDeposit {
		uint40 hardTransactionIndex;
		uint32 accountIndex;
		uint56 value;
		bytes32 intermediateStateRoot;
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

	function decodeTransactionsMetadata(bytes memory input)
	internal pure returns (TransactionsMetadata memory) {
		uint16 hardCreateCount;
		uint16 hardDepositCount;
		uint16 hardWithdrawCount;
		uint16 hardAddSignerCount;
		uint16 softWithdrawCount;
		uint16 softCreateCount;
		uint16 softTransferCount;
		uint16 softChangeSignerCount;
		assembly {
			// Add 32 to skip length
			let ptr := add(input, 32)
			hardCreateCount := shr(240, mload(ptr))
			hardDepositCount := shr(240, mload(add(ptr, 2)))
			hardWithdrawCount := shr(240, mload(add(ptr, 4)))
			hardAddSignerCount := shr(240, mload(add(ptr, 6)))
			softWithdrawCount := shr(240, mload(add(ptr, 8)))
			softCreateCount := shr(240, mload(add(ptr, 10)))
			softTransferCount := shr(240, mload(add(ptr, 12)))
			softChangeSignerCount := shr(240, mload(add(ptr, 14)))
		}
		return TransactionsMetadata(
      hardCreateCount, hardDepositCount,
      hardWithdrawCount, hardAddSignerCount,
      softWithdrawCount, softCreateCount,
      softTransferCount, softChangeSignerCount
    );
	}

	function decodeHardCreate(bytes memory input)
	internal pure returns (HardCreate memory) {
		uint40 hardTransactionIndex;
		uint32 accountIndex;
		uint56 value;
		address contractAddress;
		address signerAddress;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			hardTransactionIndex := shr(216, mload(ptr))
			accountIndex := shr(224, mload(add(ptr, 5)))
			value := shr(200, mload(add(ptr, 9)))
			contractAddress := shr(96, mload(add(ptr, 16)))
			signerAddress := shr(96, mload(add(ptr, 36)))
			intermediateStateRoot := mload(add(ptr, 56))
		}
		return HardCreate(
      hardTransactionIndex, accountIndex,
      value, contractAddress,
      signerAddress, intermediateStateRoot
    );
	}

	function decodeHardDeposit(bytes memory input)
	internal pure returns (HardDeposit memory) {
		uint40 hardTransactionIndex;
		uint32 accountIndex;
		uint56 value;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			hardTransactionIndex := shr(216, mload(ptr))
			accountIndex := shr(224, mload(add(ptr, 5)))
			value := shr(200, mload(add(ptr, 9)))
			intermediateStateRoot := mload(add(ptr, 16))
		}
		return HardDeposit(
      hardTransactionIndex, accountIndex,
      value, intermediateStateRoot
    );
	}

	function decodeHardWithdrawal(bytes memory input)
	internal pure returns (HardWithdrawal memory) {
		uint40 hardTransactionIndex;
		uint32 accountIndex;
		address withdrawalAddress;
		uint56 value;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			hardTransactionIndex := shr(216, mload(ptr))
			accountIndex := shr(224, mload(add(ptr, 5)))
			withdrawalAddress := shr(96, mload(add(ptr, 9)))
			value := shr(200, mload(add(ptr, 29)))
			intermediateStateRoot := mload(add(ptr, 36))
		}
		return HardWithdrawal(
      hardTransactionIndex, accountIndex,
      withdrawalAddress, value, intermediateStateRoot
    );
	}

	function decodeHardAddSigner(bytes memory input)
	internal pure returns (HardAddSigner memory) {
		uint40 hardTransactionIndex;
		uint32 accountIndex;
		address signingAddress;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			hardTransactionIndex := shr(216, mload(ptr))
			accountIndex := shr(224, mload(add(ptr, 5)))
			signingAddress := shr(96, mload(add(ptr, 9)))
			intermediateStateRoot := mload(add(ptr, 29))
		}
		return HardAddSigner(
			hardTransactionIndex, accountIndex,
			signingAddress, intermediateStateRoot
		);
	}

	function decodeSoftWithdrawal(bytes memory input)
	internal pure returns (SoftWithdrawal memory) {
		uint24 nonce;
		uint32 accountIndex;
		address withdrawalAddress;
		uint56 value;
		uint8 sigV;
		bytes32 sigR;
		bytes32 sigS;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			nonce := shr(232, mload(ptr))
			accountIndex := shr(224, mload(add(ptr, 3)))
			withdrawalAddress := shr(96, mload(add(ptr, 7)))
			value := shr(200, mload(add(ptr, 27)))
			sigV := shr(248, mload(add(ptr, 34)))
			sigR := mload(add(ptr, 35))
			sigS := mload(add(ptr, 67))
			intermediateStateRoot := mload(add(ptr, 99))
		}
		return SoftWithdrawal(
			nonce, accountIndex,
			withdrawalAddress, value,
			sigV, sigR, sigS,
			intermediateStateRoot
		);
	}

	function decodeSoftCreate(bytes memory input)
	internal pure returns (SoftCreate memory) {
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
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			nonce := shr(232, mload(ptr))
			fromIndex := shr(224, mload(add(ptr, 3)))
			toIndex := shr(224, mload(add(ptr, 7)))
			value := shr(200, mload(add(ptr, 11)))
			contractAddress := shr(96, mload(add(ptr, 18)))
			signingAddress := shr(96, mload(add(ptr, 38)))
			sigV := shr(248, mload(add(ptr, 58)))
			sigR := mload(add(ptr, 59))
			sigS := mload(add(ptr, 91))
			intermediateStateRoot := mload(add(ptr, 123))
		}
		return SoftCreate(
			nonce, fromIndex,
			toIndex, value,
			contractAddress, signingAddress,
			sigV, sigR, sigS,
			intermediateStateRoot
		);
	}

	function decodeSoftTransfer(bytes memory input)
	internal pure returns (SoftTransfer memory) {
		uint24 nonce;
		uint32 fromIndex;
		uint32 toIndex;
		uint56 value;
		uint8 sigV;
		bytes32 sigR;
		bytes32 sigS;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			nonce := shr(232, mload(ptr))
			fromIndex := shr(224, mload(add(ptr, 3)))
			toIndex := shr(224, mload(add(ptr, 7)))
			value := shr(200, mload(add(ptr, 11)))
			sigV := shr(248, mload(add(ptr, 18)))
			sigR := mload(add(ptr, 19))
			sigS := mload(add(ptr, 51))
			intermediateStateRoot := mload(add(ptr, 83))
		}
		return SoftTransfer(
			nonce, fromIndex,
			toIndex, value,
			sigV, sigR, sigS,
			intermediateStateRoot
		);
	}

	function decodeSoftChangeSigner(bytes memory input)
	internal pure returns (SoftChangeSigner memory) {
		uint24 nonce;
		uint32 fromIndex;
		address signingAddress;
		uint8 modificationCategory;
		uint8 sigV;
		bytes32 sigR;
		bytes32 sigS;
		bytes32 intermediateStateRoot;
		assembly {
			// Add 33 to skip length and prefix
			let ptr := add(input, 33)
			nonce := shr(232, mload(ptr))
			fromIndex := shr(224, mload(add(ptr, 3)))
			signingAddress := shr(96, mload(add(ptr, 7)))
			modificationCategory := shr(248, mload(add(ptr, 27)))
			sigV := shr(248, mload(add(ptr, 28)))
			sigR := mload(add(ptr, 29))
			sigS := mload(add(ptr, 61))
			intermediateStateRoot := mload(add(ptr, 93))
		}
		return SoftChangeSigner(
			nonce, fromIndex,
			signingAddress, modificationCategory,
			sigV, sigR, sigS,
			intermediateStateRoot
		);
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
        identitySuccess := and(
					identitySuccess,
					staticcall(gas(), 0x04, currentPointer, typeSize, outPtr, typeSize)
				)
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
      uint16 count = elements[i][0];
      if (count > 0) {
        (identitySuccess, leafIndex, txPtr) = putLeaves(
          leaves, identitySuccess, leafIndex, txPtr, i, count, elements[i][1]
        );
      }
    }

    require(identitySuccess, "Failed to copy bytes.");
    return Merkle.getMerkleRoot(leaves);
  }

  function recoverSignature(bytes memory txData)
  internal pure returns (address signer) {
    bytes32 msgHash;
    uint8 v;
    bytes32 r;
    bytes32 s;
    uint8 prefix = transactionPrefix(txData);
    require(prefix >= 4, "Input not a soft transaction.");
    if (prefix == 5) {
      // Hard creates use a null buffer for the `toIndex`
      assembly {
        let mask := 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        let ptr := add(txData, 0x28)
        let data := mload(ptr)
        mstore(ptr, and(data, mask))
      }
    }
    assembly {
      let ptr := add(txData, 0x20)
      let inputLen := sub(mload(txData), 97)
      msgHash := keccak256(ptr, inputLen)
      let rOffset := add(ptr, inputLen)
      r := mload(rOffset)
      s := mload(add(rOffset, 32))
      v := shr(248, mload(add(rOffset, 64)))
    }
    signer = ecrecover(msgHash, v, r, s);
  }
}