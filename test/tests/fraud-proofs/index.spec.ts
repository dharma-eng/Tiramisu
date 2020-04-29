import {test as fraudUtilsTest} from './FraudUtilsLib.spec';
import {test as headerFraudTest} from './HeaderFraudProofs.spec';
import {test as transactionFraudTest} from './TransactionFraudProof.spec';

const test = () => describe('Fraud Proof Tests', () => {
  fraudUtilsTest()
  headerFraudTest()
  transactionFraudTest()
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();