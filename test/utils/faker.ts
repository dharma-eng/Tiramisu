import {
  Account,
  Block,
  Blockchain,
  HardDeposit,
  HardCreate,
  StateMachine,
  State,
  sortTransactions
} from '../../app';
import { randomAccount as randomAccountParams } from './random';
import { Transaction } from '../../app/types/TransactionInterfaces';

function randomAccount(balance = 0) {
  const { address, privateKey } = randomAccountParams();
  const account = new Account({
    address,
    nonce: 0,
    balance,
    signers: [address]
  });
  account.privateKey = privateKey;
  return account;
}

export type BlockFakerOptions = {
  blockNumber?: number;
  transactions?: Transaction[];
  transactionCount?: number;
  stateSize?: number;
  stateRoot?: string;
  hardTransactionsIndex?: number;
  stateMachine?: StateMachine;
  blockChain?: Blockchain;
}

export class Faker {
  static account(balance) {
    const { address, privateKey } = randomAccount();
    const account = new Account({
      address,
      nonce: 0,
      balance,
      signers: [address]
    });
    account.privateKey = privateKey;
    return account;
  }

  static state(): Promise<State> {
    return State.create();
  }

  static async stateMachine(): Promise<StateMachine> {
    return new StateMachine(await Faker.state());
  }

  static async block(transactions: Transaction[]): Promise<Block> {
    const txs = sortTransactions(transactions);
    const machine = await Faker.stateMachine();
    Object.keys(txs).filter(k => /soft/g.exec(k)).map(k => txs[k][0].assignResolvers(() => {}, () => {}))
    await machine.execute(txs);
    const block = new Block({
      version: 0,
      blockNumber: 0,
      stateSize: machine.state.size,
      stateRoot: await machine.state.rootHash(),
      hardTransactionsIndex: 0,
      transactions: txs
    });
    return block;
  }

  static hardCreate(account: Account, value: number = 50, hardIndex: number = 0) {
    const hardCreate = new HardCreate({
      hardTransactionIndex: hardIndex,
      contractAddress: account.address,
      signerAddress: account.address,
      value
    });
    return hardCreate;
  }

  static hardDeposit(toIndex: number = 0, value: number = 50, hardIndex: number = 0) {
    const hardDeposit = new HardDeposit({
      accountIndex: toIndex,
      hardTransactionIndex: hardIndex,
      value
    });
    return hardDeposit;
  }
}