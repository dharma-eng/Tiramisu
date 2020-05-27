// import { AccountProof } from "../state";
import {
  SoftChangeSigner, SoftChangeSignerData, SoftCreateData, SoftCreate,
  SoftWithdrawalData, SoftWithdrawal, SoftTransferData, SoftTransfer
} from "../../app/modules/transactions";
import { toBuf, toHex } from "../../app/lib";
import { Account } from "../../app";
import { toBuffer } from "ethereumjs-util";
const Tx = require('ethereumjs-tx').Transaction;

export class L2Client {
  private l2Account: Account;

  constructor(
    private web3: any,
    private peg: any,
    private account: any,
    public accountIndex: number,
    private nonce: number = 0
  ) {
    this.l2Account = new Account({
      address: this.address,
      signers: [this.address],
      nonce,
      balance: 0
    });
  }

  get address(): string {
    return this.account.address;
  }

  get privateKey(): Buffer {
    return toBuf(this.account.privateKey);
  }

  get signers(): string[] {
    return this.l2Account.signers;
  }

  get balance(): number {
    return this.l2Account.balance;
  }

  sendTransaction = async (data: string): Promise<any> => {
    const pegAddress = this.peg.options.address;
    const tx = new Tx({
      nonce: this.nonce++,
      to: pegAddress,
      value: 0,
      gas: 5e6,
      gasPrice: 10,
      data
    });
    tx.sign(toBuffer(this.privateKey));
    const serialized = tx.serialize();
    await this.web3.eth.sendSignedTransaction(serialized);
  }

  async hardCreate(
    contractAddress: string,
    signingKey: string,
    value: number
  ) {
    const data = this.peg.methods.mockDeposit(
      contractAddress,
      signingKey,
      value
    ).encodeABI();
    return this.sendTransaction(data);
  }

  hardDeposit = this.hardCreate;

  async hardWithdraw(value: number) {
    const data = this.peg.methods.forceWithdrawal(this.accountIndex, value).encodeABI();
    return this.sendTransaction(data);
  }

  async hardAddSigner(signingKey: string) {
    const data = this.peg.methods.forceAddSigner(this.accountIndex, signingKey).encodeABI();
    return this.sendTransaction(data);
  }

  softWithdraw(value: number): SoftWithdrawal {
    return new SoftWithdrawal({
      accountIndex: this.accountIndex,
      value,
      nonce: this.nonce++,
      withdrawalAddress: this.address,
      privateKey: this.privateKey
    });
  }

  softCreate(value: number, toAddress: string, toSigner: string): SoftCreate {
    return new SoftCreate({
      accountIndex: this.accountIndex,
      accountAddress: toAddress,
      initialSigningKey: toSigner,
      value,
      nonce: this.nonce++,
      privateKey: this.privateKey
    });
  }

  softTransfer(value: number, toAccountIndex: number): SoftTransfer {
    return new SoftTransfer({
      accountIndex: this.accountIndex,
      nonce: this.nonce++,
      toAccountIndex,
      value,
      privateKey: this.privateKey
    });
  }

  softChangeSigner(modificationCategory: number, signingAddress: string): SoftChangeSigner {
    return new SoftChangeSigner({
      nonce: this.nonce++,
      accountIndex: this.accountIndex,
      modificationCategory,
      signingAddress,
      privateKey: this.privateKey
    });
  }
}

export default L2Client;