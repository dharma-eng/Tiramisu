export const CommitmentAbi = {
  Commitment: {
    version: 'uint16',
    blockNumber: 'uint32',
    stateSize: 'uint32',
    stateRoot: 'bytes32',
    hardTransactionsCount: 'uint40',
    transactionsRoot: 'bytes32',
    transactionsHash: 'bytes32',
    submittedAt: 'uint256'
  }
};

export const AccountProofAbi = {
  AccountProof: {
    'data': 'bytes',
    'accountIndex': 'uint256',
    'siblings': 'bytes32[]'
  }
};

export const TransactionProofAbi = {
  TransactionProof: {
    'transactionData': 'bytes',
    'siblings': 'bytes32[]'
  }
};

export const TransactionStateProofAbi = {
  TransactionStateProof: {
    // header: CommitmentAbi.Commitment,
    transactionIndex: 'uint256',
    siblings: 'bytes32[]',
    previousRootProof: 'bytes'
  }
};

export const HeaderInputAbi = {
  HeaderInput: {
    version: 'uint16',
    blockNumber: 'uint32',
    stateSize: 'uint32',
    stateRoot: 'bytes32',
    hardTransactionsCount: 'uint40',
    transactionsRoot: 'bytes32',
  }
};

export const BlockInputAbi = {
  BlockInput: {
    header: HeaderInputAbi.HeaderInput,
    transactionsData: 'bytes'
  }
};