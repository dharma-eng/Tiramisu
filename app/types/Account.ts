const { toBuffer } = require('ethereumjs-utils');
const { toInt, toBuf, toHex } = require('../lib/to');

export interface AccountType {
    address: string;
    nonce: number;
    balance: number;
    signers: string[];
    hasSufficientBalance(value: number): boolean;
    checkNonce(nonce: number): boolean;
    hasSigner(address: string): boolean;
}

interface AccountArguments {
    address: string;
    nonce: number;
    balance: number;
    signers: string[];
}

class Account implements AccountType {
    address: string;
    nonce: number;
    balance: number;
    signers: string [];
    constructor(args: AccountArguments) {
        const {
            address, /* hex string */
            nonce, /* number */
            balance, /* number */
            signers /* array of hex strings */
        } = args;
        this.address = toHex(address);
        this.nonce = toInt(nonce);
        this.balance = toInt(balance);
        this.signers = signers.map(toHex);
    }

    addSigner(address: string): void {
        this.signers.push(toHex(address));
    }

    removeSigner(address: string): void {
        let addr = toHex(address).toLowerCase();
        let signerIndex = this.signers.map(s => s.toLowerCase()).indexOf(addr);
        this.signers.splice(signerIndex, 1);
    }

    /* outputs buffer */
    encode(): Buffer {
        const address = toBuf(this.address, 20) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const balance = toBuf(this.balance, 7) as Buffer;
        let signerString = '' as string;
        for (let signer of this.signers) {
            let s = (signer.slice(0, 2) == '0x') ? signer.slice(2) : signer as string;
            signerString = `${signerString}${s}`
        }
        let signers = toBuf(`0x${signerString}`) as Buffer;
        return Buffer.concat([
            address,
            nonce,
            balance,
            signers
        ]);
    }

    /* takes buffer or string, outputs account */
    static decode(_account): Account {
        const account = Buffer.isBuffer(_account) ? _account : toBuffer(_account) as Buffer;
        const address = toHex(account.slice(0, 20)) as string;
        const nonce = toInt (account.slice(20, 23)) as number;
        const balance = toInt(account.slice(23, 30)) as number;
        const signerCount = (account.length - 30) / 20 as number;
        const signers = [] as string[];
        for (let i = 0; i < signerCount; i++) {
            const ptr = 30 + i*20;
            const signer = toHex(account.slice(ptr, ptr+20)) as string;
            signers.push(signer);
        }
        return new Account({
            address,
            nonce,
            balance,
            signers
        })
    }

    hasSigner(_address: string): boolean {
        let address = toHex(_address).toLowerCase();
        return this.signers.filter(s => s.toLowerCase() == address).length > 0;
    }

    checkNonce(nonce: number): boolean {
        return toInt(nonce) == this.nonce;
    }

    hasSufficientBalance(value: number): boolean {
        return this.balance >= toInt(value);
    }
}

module.exports = Account;
