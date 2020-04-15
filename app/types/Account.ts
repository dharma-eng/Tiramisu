const { toBuffer } = require('ethereumjs-utils');
const { toInt, toBuf, toHex } = require('../lib/to');

interface AccountArguments {
    address: string;
    nonce: number;
    balance: number;
    signers: string[];
}

class Account {
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

    addSigner(address: string) {
        this.signers.push(toHex(address));
    }

    removeSigner(address: string) {
        let addr = toHex(address).toLowerCase();
        let signerIndex = this.signers.map(s => s.toLowerCase()).indexOf(addr);
        this.signers.splice(signerIndex, 1);
    }

    /* outputs buffer */
    encode() {
        const address = toBuf(this.address, 20);
        const nonce = toBuf(this.nonce, 3);
        const balance = toBuf(this.balance, 7);
        let signerString = '';
        for (let signer of this.signers) {
            let s = (signer.slice(0, 2) == '0x') ? signer.slice(2) : signer;
            signerString = `${signerString}${s}`
        }
        let signers = toBuf(`0x${signerString}`)
        return Buffer.concat([
            address,
            nonce,
            balance,
            signers
        ]);
    }

    /* takes buffer or string, outputs account */
    static decode(_account) {
        const account = Buffer.isBuffer(_account) ? _account : toBuffer(_account);
        const address = toHex(account.slice(0, 20));
        const nonce = toInt (account.slice(20, 23));
        const balance = toInt(account.slice(23, 30));
        const signerCount = (account.length - 30) / 20;
        const signers = [];
        for (let i = 0; i < signerCount; i++) {
            const ptr = 30 + i*20;
            const signer = toHex(account.slice(ptr, ptr+20));
            signers.push(signer);
        }
        return new Account({
            address,
            nonce,
            balance,
            signers
        })
    }

    hasSigner(_address: string) {
        let address = toHex(_address).toLowerCase()
        return this.signers.filter(s => s.toLowerCase() == address).length > 0;
    }

    checkNonce(nonce: number) {
        return toInt(nonce) == this.nonce;
    }

    hasSufficientBalance(value: number) {
        return this.balance >= toInt(value);
    }
}

module.exports = Account;
