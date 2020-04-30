import { AccountType } from "../type/accountType";
import { Account } from "../../types";

export const getAccount = {
  type: AccountType,
  resolve: () => {
    return new Account({
      address: "0x030585f58f92AD5c0D0Ce457B8F9172534c6e9D1",
      nonce: 0,
      balance: 121.5,
      signers: ["0xa6189D24a8254E7396C600dB96CE82f4EbE56F40", "0x260e6D0d9aE65B8eC765E3F58335150Ccd4Ef032"]
    });
  },
};
