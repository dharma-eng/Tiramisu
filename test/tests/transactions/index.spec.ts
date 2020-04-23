import testHardSigner from './HardAddSigner.spec'
import testHardCreate from './HardCreate.spec'
import testHardDeposit from './HardDeposit.spec'
import testHardWithdraw from './HardWithdraw.spec'
import testSoftChangeSigner from './SoftChangeSigner.spec'
import testSoftCreate from './SoftCreate.spec'
import testSoftTransfer from './SoftTransfer.spec'
import testSoftWithdraw from './SoftWithdrawal.spec'

const test = () => describe('Transaction Execution', () => {
  testHardSigner()
  testHardCreate()
  testHardDeposit()
  testHardWithdraw()
  testSoftChangeSigner()
  testSoftCreate()
  testSoftTransfer()
  testSoftWithdraw()
});

export default test;
if (process.env.NODE_ENV == "all") test();