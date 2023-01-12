// const { expect } = require('chai');
// const { UUPSOwnableDeployer } = require('../../helpers/deployers');

// describe('UUPSOwnable', async () => {
//   let uupsBase;
//   let owner, ivan;

//   beforeEach('setup', async () => {
//     [owner, ivan, treasury] = await ethers.getSigners();

//     uupsBase = await new UUPSOwnableDeployer().deployProxy();
//   });

//   describe('removeUpgradeability()', async () => {
//     it('should remove upgreadability', async () => {
//       expect(await uupsBase.proxy.isUpgradeable()).to.be.equal(true);

//       await uupsBase.proxy.removeUpgradeability();
//       expect(await uupsBase.proxy.isUpgradeable()).to.be.equal(false);
//     });
//   });
//   // describe('_authorizeUpgrade()', async () => {
//   //   it('should upgrade sc', async () => {
//   //     const newPayment = await new PaymentDeployer().deployProxy();

//   //     await payment.proxy.upgradeTo(newPayment.implementation.address);
//   //   });
//   // });
// });

// // npx hardhat coverage --testfiles "test/extensions/UUPSOwnable.test.js"
