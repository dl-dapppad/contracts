const { expect } = require('chai');
const { toWei } = require('../../../helpers/bn');
const { ERC20Deployer, FarmingDeployer } = require('../../../helpers/deployers');

describe('Farming', async () => {
  let farming, usdt, dapp;
  let owner, ivan;

  beforeEach('setup', async () => {
    [owner, ivan] = await ethers.getSigners();

    farming = await new FarmingDeployer().deployProxy();
    usdt = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000').toString(), owner.address, '18']);
    dapp = await new ERC20Deployer().deployProxy(['DAPP', 'DAPP', toWei('1000').toString(), ivan.address, '18']);
  });

  describe('Farming_init()', async () => {
    it('should initialize', async () => {
      expect(await farming.proxy.owner()).to.be.equal(owner.address);
    });
    it('should revert on second initialize', async () => {
      await expect(farming.proxy.Farming_init()).to.be.revertedWith('Initializable: contract is already initialized');
    });
  });

  describe('setTokens()', async () => {
    it('should set tokens', async () => {
      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);

      expect(await farming.proxy.investmentToken()).to.be.equal(dapp.proxy.address);
      expect(await farming.proxy.rewardToken()).to.be.equal(usdt.proxy.address);
    });
  });

  describe('invest()', async () => {
    beforeEach(async () => {
      await usdt.proxy.approve(farming.proxy.address, toWei('1000').toString());

      await dapp.proxy.connect(ivan).transfer(owner.address, toWei('500').toString());
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('500').toString());
      await dapp.proxy.approve(farming.proxy.address, toWei('500').toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should invest tokens', async () => {
      await farming.proxy.connect(ivan).invest(toWei('200').toString());

      let invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('200').toString());
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('200').toString());
    });
    it('should reinvest tokens', async () => {
      await farming.proxy.connect(ivan).invest(toWei('200').toString());
      await farming.proxy.connect(ivan).invest(toWei('300').toString());

      invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('500').toString());
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('500').toString());
    });
    it('should reinvest tokens after supply', async () => {
      await farming.proxy.connect(ivan).invest(toWei('200').toString());
      await farming.proxy.supply(toWei('200').toString());

      await farming.proxy.invest(toWei('400').toString());
      await farming.proxy.connect(ivan).invest(toWei('200').toString());

      invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('400').toString());
      expect(invest.cumulativeSum).to.be.equal('10000000000000000000000000');
      expect(invest.rewards).to.be.equal(toWei('200').toString());

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('400').toString());
      expect(invest.cumulativeSum).to.be.equal('10000000000000000000000000');
      expect(invest.rewards).to.be.equal(toWei('0').toString());

      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('800').toString());

      await farming.proxy.supply(toWei('200').toString());
      await farming.proxy.invest(toWei('100').toString());
      await farming.proxy.connect(ivan).invest(toWei('100').toString());

      invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('500').toString());
      expect(invest.cumulativeSum).to.be.equal('12500000000000000000000000');
      expect(invest.rewards).to.be.equal(toWei('300').toString());

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('500').toString());
      expect(invest.cumulativeSum).to.be.equal('12500000000000000000000000');
      expect(invest.rewards).to.be.equal(toWei('100').toString());

      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('1000').toString());
    });
  });

  // Minimal invest amount = 10^24 - 10^18 = 1_000_000
  describe('invest(), invest decimals 24', async () => {
    beforeEach(async () => {
      dapp = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 24).toString(), ivan.address, '24']);

      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('1000', 24).toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should invest minimal token amount', async () => {
      await farming.proxy.connect(ivan).invest('1000000');

      const invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal('1');
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');

      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('1000', 24).minus('1000000').toString());
    });
    it('should invest maximum token amount', async () => {
      await farming.proxy.connect(ivan).invest(toWei('1000', 24).toString());

      const invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('1000', 18).toString());
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');

      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal('0');
    });
    it('should revert on invalid amount', async () => {
      await expect(farming.proxy.connect(ivan).invest('999999')).to.be.revertedWith('Farming: invalid amount');
    });
  });

  describe('invest(), invest decimals 6', async () => {
    beforeEach(async () => {
      dapp = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 6).toString(), ivan.address, '6']);

      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('1000', 6).toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should invest minimal token amount', async () => {
      await farming.proxy.connect(ivan).invest('1');

      const invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('1', 12).toString());
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');

      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('1000', 6).minus('1').toString());
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal('1');
    });
    it('should invest maximum token amount', async () => {
      await farming.proxy.connect(ivan).invest(toWei('1000', 6).toString());

      const invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('1000', 18).toString());
      expect(invest.cumulativeSum).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');

      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('1000', 6).toString());
    });
  });

  describe('supply()', async () => {
    beforeEach(async () => {
      await usdt.proxy.approve(farming.proxy.address, toWei('1000').toString());

      await dapp.proxy.connect(ivan).transfer(owner.address, toWei('500').toString());
      await dapp.proxy.approve(farming.proxy.address, toWei('500').toString());
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('500').toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should invest tokens, 1Wei', async () => {
      await farming.proxy.invest('1');
      await farming.proxy.supply(toWei('400').toString());

      // 400 * 10^18 * 10^25
      expect(await farming.proxy.cumulativeSum()).to.be.equal('4000000000000000000000000000000000000000000000');
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal(toWei('400').toString());

      await farming.proxy.connect(ivan).invest('1');
      await farming.proxy.supply(toWei('200').toString());

      // 400 * 10^18 * 10^25 / 1 + 200 * 10^18 * 10^25 / 2
      expect(await farming.proxy.cumulativeSum()).to.be.equal('5000000000000000000000000000000000000000000000');
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal(toWei('600').toString());
    });
    it('should revert on no investment', async () => {
      await farming.proxy.invest('1');
      await expect(farming.proxy.connect(ivan).supply('0')).to.be.revertedWith('Farming: invalid amount');
    });
  });

  describe('supply(), revert', async () => {
    it('should revert on no investment', async () => {
      await expect(farming.proxy.connect(ivan).supply('1')).to.be.revertedWith('Farming: no investment');
    });
  });

  describe('getRewards()', async () => {
    beforeEach(async () => {
      dapp = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 24).toString(), ivan.address, '24']);

      await usdt.proxy.approve(farming.proxy.address, toWei('1000').toString());

      await dapp.proxy.connect(ivan).transfer(owner.address, toWei('500', 24).toString());
      await dapp.proxy.approve(farming.proxy.address, toWei('500', 24).toString());
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('500', 24).toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should correctly calculate rewards', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.supply(toWei('200').toString());
      expect(await farming.proxy.getInvestmentAmount(owner.address)).to.be.equal(toWei('100', 24).toString());
      expect(await farming.proxy.getRewards(owner.address)).to.be.equal(toWei('200').toString());

      await farming.proxy.connect(ivan).invest(toWei('100', 24).toString());
      await farming.proxy.supply(toWei('200').toString());
      expect(await farming.proxy.getInvestmentAmount(ivan.address)).to.be.equal(toWei('100', 24).toString());
      expect(await farming.proxy.getRewards(owner.address)).to.be.equal(toWei('300').toString());
      expect(await farming.proxy.getRewards(ivan.address)).to.be.equal(toWei('100').toString());

      await farming.proxy.connect(ivan).invest(toWei('400', 24).toString());
      await farming.proxy.supply(toWei('300').toString());
      expect(await farming.proxy.getInvestmentAmount(ivan.address)).to.be.equal(toWei('500', 24).toString());
      expect(await farming.proxy.getRewards(owner.address)).to.be.equal(toWei('350').toString());
      expect(await farming.proxy.getRewards(ivan.address)).to.be.equal(toWei('350').toString());
    });
  });

  describe('claim()', async () => {
    beforeEach(async () => {
      usdt = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 6).toString(), owner.address, '6']);
      dapp = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 24).toString(), ivan.address, '24']);

      await usdt.proxy.approve(farming.proxy.address, toWei('1000', 6).toString());

      await dapp.proxy.connect(ivan).transfer(owner.address, toWei('500', 24).toString());
      await dapp.proxy.approve(farming.proxy.address, toWei('500', 24).toString());
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('500', 24).toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should correctly claim rewards, one account', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.supply(toWei('200', 6).toString());
      await farming.proxy.claim(owner.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('100', 18).toString());
      expect(invest.cumulativeSum).to.be.equal('20000000000000000000000000');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('1000', 6).toString());
    });
    it('should correctly claim rewards, two account', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.connect(ivan).invest(toWei('200', 24).toString());
      await farming.proxy.supply(toWei('900', 6).toString());

      await farming.proxy.claim(ivan.address);

      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal(toWei('300', 6).toString());

      await farming.proxy.claim(owner.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('100', 18).toString());
      expect(invest.cumulativeSum).to.be.equal('30000000000000000000000000');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('400', 6).toString());

      invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal(toWei('200', 18).toString());
      expect(invest.cumulativeSum).to.be.equal('30000000000000000000000000');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('600', 6).toString());

      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
    });
    it('should revert if nothing to claim', async () => {
      await expect(farming.proxy.claim(owner.address)).to.be.revertedWith('Farming: nothing to claim');
    });
  });

  describe('withdraw()', async () => {
    beforeEach(async () => {
      // Reward / supply token
      usdt = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 6).toString(), owner.address, '6']);
      //Invest token
      dapp = await new ERC20Deployer().deployProxy(['USDT', 'USDT', toWei('1000', 24).toString(), ivan.address, '24']);

      await usdt.proxy.approve(farming.proxy.address, toWei('1000', 6).toString());

      await dapp.proxy.connect(ivan).transfer(owner.address, toWei('500', 24).toString());
      await dapp.proxy.approve(farming.proxy.address, toWei('500', 24).toString());
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('500', 24).toString());

      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
    });
    it('should correctly withdraw rewards, one account', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.supply(toWei('200', 6).toString());
      await farming.proxy.withdraw(toWei('99999', 24).toString(), ivan.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('800', 6).toString());
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('200', 6).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('600', 24).toString());
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
    });
    it('should correctly withdraw without rewards, one account', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.withdraw(toWei('99999', 24).toString(), ivan.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('1000', 6).toString());
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('0', 6).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('600', 24).toString());
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
    });
    it('should correctly withdraw rewards, two account', async () => {
      await farming.proxy.invest(toWei('100', 24).toString());
      await farming.proxy.connect(ivan).invest(toWei('200', 24).toString());
      await farming.proxy.supply(toWei('900', 6).toString());

      await farming.proxy.connect(ivan).withdraw(toWei('99999', 24).toString(), ivan.address);
      await farming.proxy.withdraw(toWei('99999', 24).toString(), owner.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('400', 6).toString());
      expect(await dapp.proxy.balanceOf(owner.address)).to.be.equal(toWei('500', 24).toString());

      invest = await farming.proxy.accountInvestInfo(ivan.address);
      expect(invest.amount).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('600', 6).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('500', 24).toString());

      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal('0');
    });
    it('should correctly withdraw part of amount few times', async () => {
      await farming.proxy.invest(toWei('100', 24).toString()); // DAPP
      await farming.proxy.supply(toWei('200', 6).toString()); // USDT

      // Owner balance USDT=1000(base)-200(supply)=800USDT
      // Ivan balance USDT=0 USDT
      // Owner balance DAPP=500(from Ivan)-100(invest)=400DAPP
      // Ivan balance DAPP=1000(base)-500(for owner)=500DAPP
      await farming.proxy.withdraw(toWei('10', 24).toString(), ivan.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('90', 18).toString());
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('800', 6).toString());
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('200', 6).toString());
      expect(await dapp.proxy.balanceOf(owner.address)).to.be.equal(toWei('400', 24).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('510', 24).toString());
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('90', 24).toString());

      await farming.proxy.withdraw(toWei('40', 24).toString(), ivan.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal(toWei('50', 18).toString());
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('800', 6).toString());
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('200', 6).toString());
      expect(await dapp.proxy.balanceOf(owner.address)).to.be.equal(toWei('400', 24).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('550', 24).toString());
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal(toWei('50', 24).toString());

      await farming.proxy.withdraw(toWei('9999', 24).toString(), ivan.address);

      invest = await farming.proxy.accountInvestInfo(owner.address);
      expect(invest.amount).to.be.equal('0');
      expect(invest.rewards).to.be.equal('0');
      expect(await usdt.proxy.balanceOf(owner.address)).to.be.equal(toWei('800', 6).toString());
      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('200', 6).toString());
      expect(await dapp.proxy.balanceOf(owner.address)).to.be.equal(toWei('400', 24).toString());
      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('600', 24).toString());
      expect(await farming.proxy.getTotalRewardAmount()).to.be.equal('0');
      expect(await farming.proxy.getTotalInvestedAmount()).to.be.equal('0');
    });
    it('should revert if invalid amount', async () => {
      await expect(farming.proxy.withdraw('0', owner.address)).to.be.revertedWith('Farming: invalid amount');
    });
    it('should revert if nothing to withdraw', async () => {
      await expect(farming.proxy.withdraw('1000000', owner.address)).to.be.revertedWith('Farming: nothing to withdraw');
    });
  });

  describe('withdrawStuckERC20()', async () => {
    it('should correctly withdraw stuck ERC20', async () => {
      await usdt.proxy.transfer(farming.proxy.address, toWei('500').toString());
      await farming.proxy.withdrawStuckERC20(usdt.proxy.address, ivan.address, toWei('500').toString());

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('500').toString());
    });
    it('should correctly withdraw stuck ERC20, check investment token', async () => {
      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('100').toString());
      await farming.proxy.connect(ivan).invest(toWei('100').toString());

      dapp.proxy.connect(ivan).transfer(farming.proxy.address, toWei('200').toString());
      await farming.proxy.withdrawStuckERC20(dapp.proxy.address, owner.address, toWei('300').toString());

      expect(await dapp.proxy.balanceOf(owner.address)).to.be.equal(toWei('200').toString());
    });
    it('should correctly withdraw stuck ERC20, check reward token', async () => {
      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);

      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('1').toString());
      await farming.proxy.connect(ivan).invest(toWei('1').toString());

      await usdt.proxy.approve(farming.proxy.address, toWei('333').toString());
      await farming.proxy.supply(toWei('333').toString());

      usdt.proxy.transfer(farming.proxy.address, toWei('666').toString());
      await farming.proxy.withdrawStuckERC20(usdt.proxy.address, ivan.address, toWei('1000').toString());

      expect(await usdt.proxy.balanceOf(ivan.address)).to.be.equal(toWei('666').toString());
    });
    it('should revert if nothing to withdraw', async () => {
      await farming.proxy.setTokens(dapp.proxy.address, usdt.proxy.address);
      await dapp.proxy.connect(ivan).approve(farming.proxy.address, toWei('100').toString());
      await farming.proxy.connect(ivan).invest(toWei('100').toString());

      await expect(
        farming.proxy.withdrawStuckERC20(dapp.proxy.address, ivan.address, toWei('100').toString())
      ).to.be.revertedWith('Farming: nothing to withdraw');

      expect(await dapp.proxy.balanceOf(ivan.address)).to.be.equal(toWei('900').toString());
    });
  });

  describe('_authorizeUpgrade()', async () => {
    it('should upgrade contract', async () => {
      const newFarming = await new FarmingDeployer().deploy();

      await farming.proxy.upgradeTo(farming.implementation.address);
    });
  });

  describe('supportsInterface()', async () => {
    it('should support interface', async () => {
      expect(await farming.proxy.supportsInterface('0xe78aaf71')).to.be.equal(true);
    });
  });
});

// npx hardhat coverage --testfiles "test/implementations/farming/Farming.test.js";
