import {test as fraudUtilsTest} from './FraudUtilsLib.spec';
import {test as headerFraudTest} from './HeaderFraudProofs.spec';
import {test as transactionFraudTest} from './TransactionFraudProof.spec';
import {test as executionFraudTest} from './ExecutionFraudProofs.spec';

const test = () => describe('Fraud Proof Tests', () => {
  fraudUtilsTest()
  headerFraudTest()
  transactionFraudTest()
  executionFraudTest();
});

export default test;
if (process.env.NODE_ENV == 'all') test();