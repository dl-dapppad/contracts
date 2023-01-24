const { expect } = require('chai');
const { toWei } = require('../helpers/bn');
const { AccessControlDeployer, CashbackDeployer } = require('../helpers/deployers');

describe('Cashback', async () => {
  const productErc20 = '0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b';
  const productErc721 = '0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a';

  let accessControl, cashback;
  let owner, ivan, oleg, payment;

  beforeEach('setup', async () => {
    [owner, ivan, oleg, payment] = await ethers.getSigners();

    accessControl = await new AccessControlDeployer().deploy();
    cashback = await new CashbackDeployer().deployProxy([accessControl.implementation.address]);

    // Setup roles
    const PAYMENT_CONTRACT_ROLE = await cashback.proxy.PAYMENT_CONTRACT_ROLE();
    await accessControl.implementation.grantRole(PAYMENT_CONTRACT_ROLE, payment.address);
    // End
  });

  describe('Cashback_init()', async () => {
    it('should initialize', async () => {
      expect(await cashback.proxy.accessControl()).to.be.equal(accessControl.implementation.address);
    });
    it('should revert on second initialize', async () => {
      await expect(cashback.proxy.Cashback_init(owner.address)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('supportsInterface()', async () => {
    it('should support ICashback interface', async () => {
      expect(await cashback.proxy.supportsInterface('0xe237f76e')).to.be.equal(true);
    });
    it('should support IERC165Upgradeable interface', async () => {
      expect(await cashback.proxy.supportsInterface('0x01ffc9a7')).to.be.equal(true);
    });
  });

  describe('mintPoints()', async () => {
    it('should correctly mint points, one product, once for ivan and oleg', async () => {
      // Mint for Ivan
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('100').toString(), ivan.address);

      let productCashback = await cashback.proxy.productsCahsback(productErc20);
      let ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, ivan.address);
      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('100').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(0);
      expect(ivanAccountCahsback.points).to.be.equal(toWei('100').toString());
      expect(ivanCurrentCashback).to.be.equal(0);
      // End

      // Mint for Oleg
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('50').toString(), oleg.address);

      productCashback = await cashback.proxy.productsCahsback(productErc20);
      ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, ivan.address);
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      const olegAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, oleg.address);
      const olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, oleg.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('150').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(0);
      expect(ivanAccountCahsback.points).to.be.equal(toWei('100').toString());
      expect(ivanCurrentCashback).to.be.equal(toWei('50').toString());
      expect(olegAccountCahsback.pendingCashback).to.be.equal(0);
      expect(olegAccountCahsback.points).to.be.equal(toWei('50').toString());
      expect(olegCurrentCashback).to.be.equal(0);
      // End
    });
    it('should correctly mint points, two product, once for ivan and oleg', async () => {
      // Mint for Ivan
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('100').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('200').toString(), oleg.address);
      await cashback.proxy.connect(payment).mintPoints(productErc721, toWei('400').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc721, toWei('600').toString(), oleg.address);

      // Check erc20 product
      let productCashback = await cashback.proxy.productsCahsback(productErc20);
      let ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, ivan.address);
      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      let olegAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, oleg.address);
      let olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, oleg.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('300').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(0);
      expect(ivanAccountCahsback.points).to.be.equal(toWei('100').toString());
      expect(ivanCurrentCashback).to.be.equal(toWei('200').toString());
      expect(olegAccountCahsback.pendingCashback).to.be.equal(0);
      expect(olegAccountCahsback.points).to.be.equal(toWei('200').toString());
      expect(olegCurrentCashback).to.be.equal(0);
      // End

      // Check erc721 product
      productCashback = await cashback.proxy.productsCahsback(productErc721);
      ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc721, ivan.address);
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      olegAccountCahsback = await cashback.proxy.accountsCahsback(productErc721, oleg.address);
      olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, oleg.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('1000').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(0);
      expect(ivanAccountCahsback.points).to.be.equal(toWei('400').toString());
      expect(ivanCurrentCashback).to.be.equal(toWei('600').toString());
      expect(olegAccountCahsback.pendingCashback).to.be.equal(0);
      expect(olegAccountCahsback.points).to.be.equal(toWei('600').toString());
      expect(olegCurrentCashback).to.be.equal(0);
      // End
    });
    it('should correctly mint points, one product, with remint for ivan', async () => {
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('200').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('100').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('300').toString(), ivan.address);

      const productCashback = await cashback.proxy.productsCahsback(productErc20);
      const ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, ivan.address);
      const ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('600').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(toWei('400').toString());
      expect(ivanAccountCahsback.points).to.be.equal(toWei('600').toString());
      expect(ivanCurrentCashback).to.be.equal(toWei('400').toString());
    });
    it('should correctly mint points, one product, with remint for ivan and oleg', async () => {
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('200').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('100').toString(), oleg.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('300').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('1200').toString(), oleg.address);

      // After mint #1. Ivan Cashback = 0. Oleg Cashback = 0.
      // After mint #2. Ivan Cashback = 100. Oleg Cashback = 0.
      // After mint #3. Ivan Cashback = 300. Oleg Cashback = 100.
      // After mint #4. Ivan Cashback = 1300. Oleg Cashback = 300.

      const productCashback = await cashback.proxy.productsCahsback(productErc20);
      const ivanAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, ivan.address);
      const ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      const olegAccountCahsback = await cashback.proxy.accountsCahsback(productErc20, oleg.address);
      const olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, oleg.address);
      expect(productCashback.totalPoints).to.be.equal(toWei('1800').toString());
      expect(ivanAccountCahsback.pendingCashback).to.be.equal(toWei('300').toString());
      expect(ivanAccountCahsback.points).to.be.equal(toWei('500').toString());
      expect(ivanCurrentCashback).to.be.equal(toWei('1300').toString());
      expect(olegAccountCahsback.pendingCashback).to.be.equal(toWei('300').toString());
      expect(olegAccountCahsback.points).to.be.equal(toWei('1300').toString());
      expect(olegCurrentCashback).to.be.equal(toWei('300').toString());
    });
    it('should revert if invalid amount', async () => {
      await expect(cashback.proxy.connect(payment).mintPoints(productErc20, '0', ivan.address)).to.be.revertedWith(
        'Cashback: invalid amount'
      );
    });
    it('should revert if forbidden', async () => {
      await expect(cashback.proxy.mintPoints(productErc20, '0', ivan.address)).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('useCashback()', async () => {
    beforeEach(async () => {
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('100').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('300').toString(), oleg.address);
      await cashback.proxy.connect(payment).mintPoints(productErc20, toWei('800').toString(), ivan.address);

      await cashback.proxy.connect(payment).mintPoints(productErc721, toWei('400').toString(), ivan.address);
      await cashback.proxy.connect(payment).mintPoints(productErc721, toWei('600').toString(), oleg.address);
      await cashback.proxy.connect(payment).mintPoints(productErc721, toWei('2000').toString(), ivan.address);
    });
    it('should have correct cashback amount', async () => {
      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      let olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, oleg.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('500').toString());
      expect(olegCurrentCashback).to.be.equal(toWei('600').toString());

      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      olegCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, oleg.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('1400').toString());
      expect(olegCurrentCashback).to.be.equal(toWei('1200').toString());

      const ivanTotalCashbacks = await cashback.proxy.getAccountCashbacks([productErc20, productErc721], ivan.address);
      expect(ivanTotalCashbacks[0]).to.be.equal(toWei('500').toString());
      expect(ivanTotalCashbacks[1]).to.be.equal(toWei('1400').toString());

      const olegTotalCashbacks = await cashback.proxy.getAccountCashbacks([productErc20, productErc721], oleg.address);
      expect(olegTotalCashbacks[0]).to.be.equal(toWei('600').toString());
      expect(olegTotalCashbacks[1]).to.be.equal(toWei('1200').toString());
    });
    it('should correct use cashback for Ivan', async () => {
      await cashback.proxy
        .connect(payment)
        .useCashback([productErc20, productErc721], [toWei('100').toString(), toWei('200').toString()], ivan.address);

      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('400').toString());
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('1200').toString());

      await cashback.proxy
        .connect(payment)
        .useCashback(
          [productErc20, productErc721],
          [toWei('99999999').toString(), toWei('99999999').toString()],
          ivan.address
        );

      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(ivanCurrentCashback).to.be.equal('0');
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      expect(ivanCurrentCashback).to.be.equal('0');
    });
    it('should skip when cashback is zero', async () => {
      await cashback.proxy
        .connect(payment)
        .useCashback(
          [productErc20, productErc721],
          [toWei('99999999').toString(), toWei('99999999').toString()],
          ivan.address
        );

      await cashback.proxy
        .connect(payment)
        .useCashback(
          [productErc20, productErc721],
          [toWei('99999999').toString(), toWei('99999999').toString()],
          ivan.address
        );

      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(ivanCurrentCashback).to.be.equal('0');
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      expect(ivanCurrentCashback).to.be.equal('0');
    });
    it('should skip when amount is zero', async () => {
      await cashback.proxy.connect(payment).useCashback([productErc20, productErc721], [0, 0], ivan.address);

      let ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc20, ivan.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('500').toString());
      ivanCurrentCashback = await cashback.proxy.getAccountCashback(productErc721, ivan.address);
      expect(ivanCurrentCashback).to.be.equal(toWei('1400').toString());
    });
    it('should mint and use cashback', async () => {
      const product = '0xb9a5dc0048db9a7d13548781df3cd4b2334606391f75f40c14225a92f4cb3537';

      await cashback.proxy.connect(payment).mintPoints(product, toWei('100').toString(), owner.address);
      let ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('0').toString());

      await cashback.proxy.connect(payment).useCashback([product], [toWei('9999').toString()], owner.address);
      ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('0').toString());

      await cashback.proxy.connect(payment).mintPoints(product, toWei('200').toString(), owner.address);
      ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('200').toString());

      await cashback.proxy.connect(payment).useCashback([product], [toWei('150').toString()], owner.address);
      ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('50').toString());

      await cashback.proxy.connect(payment).mintPoints(product, toWei('300').toString(), ivan.address);
      ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('350').toString());

      await cashback.proxy.connect(payment).useCashback([product], [toWei('350').toString()], owner.address);
      ownerCurrentCashback = await cashback.proxy.getAccountCashback(product, owner.address);
      expect(ownerCurrentCashback).to.be.equal(toWei('0').toString());
    });
    it('should revert if forbidden', async () => {
      await expect(cashback.proxy.useCashback([], [], ivan.address)).to.be.revertedWith('UUPSAC: forbidden');
    });
  });

  describe('setAccessControl()', async () => {
    it('should setup new access control', async () => {
      const newAccessControl = await new AccessControlDeployer().deploy();
      await cashback.proxy.setAccessControl(newAccessControl.implementation.address);
    });
    it('should revert if new access control is invalid', async () => {
      await expect(cashback.proxy.setAccessControl(cashback.proxy.address)).to.be.revertedWith(
        'UUPSAC: invalid address'
      );
    });
  });

  describe('upgradeTo()', async () => {
    it('should upgrade', async () => {
      const newCashback = await new CashbackDeployer().deploy();
      await cashback.proxy.upgradeTo(newCashback.implementation.address);
    });
    it('should revert if contract is not upgreadable', async () => {
      const newCashback = await new CashbackDeployer().deploy();
      await cashback.proxy.removeUpgradeability();

      await expect(cashback.proxy.upgradeTo(newCashback.implementation.address)).to.be.revertedWith(
        "UUPSAC: upgrade isn't available"
      );
    });
  });
});

// npx hardhat coverage --testfiles "test/Cashback.test.js"
