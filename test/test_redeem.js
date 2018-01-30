const CaiShen = artifacts.require("./CaiShen.sol");
const increaseTime = require("./increaseTime.js");
const expectThrow = require("./expectThrow.js");

contract('CaiShen', accounts => {
  let cs;
  const creator = accounts[0];
  const giver = accounts[0];
  const recipient = accounts[1];
  const amount = web3.toWei(5, "ether");
  const fee = web3.toWei(0.005, "ether");

  it("should fail when trying to redeem gift before expiry time", async () => {
    cs = await CaiShen.new();
    const expiry = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1000;

    await cs.give(recipient, expiry, {to: cs.address, from: creator, value: amount});
    let result = await expectThrow(cs.redeem(0, {from: recipient}));

    assert.equal(result, true, "redeem() should throw an error because of the expiry timestamp");
  });

  it("should successfully redeem gift", async () => {
    cs = await CaiShen.new();

    const initialContractBalance = web3.eth.getBalance(cs.address).toNumber();
    const initialGiverBalance = web3.eth.getBalance(giver).toNumber();
    const initialRecipientBalance = web3.eth.getBalance(recipient).toNumber();

    assert.equal(initialContractBalance, 0, "Initial contract balance should be 0");

    const expiry = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 10;

    // Call give()
    await cs.give(recipient, expiry, {to: cs.address, from: giver, value: amount});

    const feesCollected = await cs.feesCollected();
    assert.equal(feesCollected.toNumber(), fee, "Total fees collected should be correct");

    const postGiveContractBalance = web3.eth.getBalance(cs.address).toNumber();
    const postGiveGiverBalance = web3.eth.getBalance(giver).toNumber();
    const postGiveRecipientBalance = web3.eth.getBalance(recipient).toNumber();

    assert.equal(postGiveContractBalance, amount, "Post-give contract balance should be 5 ether");
    assert.isAbove(initialGiverBalance, postGiveGiverBalance, "Post-give giver balance should have been reduced");
    assert.equal(initialRecipientBalance, postGiveRecipientBalance, "Post-give recipient balance should be untouched");

    const beforeTimeTravelTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    await(increaseTime(20000));

    const afterTimeTravelTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    assert.isAbove(afterTimeTravelTime, beforeTimeTravelTime, "Time travel must be successful");

    // Call redeem()
    await cs.redeem(0, {from: recipient});

    const postRedeemContractBalance = web3.eth.getBalance(cs.address).toNumber();
    const postRedeemGiverBalance = web3.eth.getBalance(giver).toNumber();
    const postRedeemRecipientBalance = web3.eth.getBalance(recipient).toNumber();

    assert.equal(postRedeemContractBalance, fee, "Post-redeem contract balance should just be the fee");
    assert.equal(postRedeemGiverBalance, postRedeemGiverBalance, "Post-redeem giver balance should be untouched");
    assert.isAbove(postRedeemRecipientBalance, initialRecipientBalance, "Post-redeem recipient balance should have been increased");
  });
});