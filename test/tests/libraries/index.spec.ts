import {test as accountLibTest} from './AccountLib.spec';
import {test as transactionsLibTest} from './TransactionsLib.spec';

const test = () => describe('Library Tests', () => {
  accountLibTest()
  transactionsLibTest()
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();