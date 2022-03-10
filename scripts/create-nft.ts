import * as zksync from "zksync";
import * as ethers from "ethers";

const PRIVATE = "eb3b9a6007707125774de698e5985c2cfa728189cb520f859fbd9afa459218db"

async function main() {
  console.log(`Running script for example NFT creation`);

  // get providers
  const syncProvider = await zksync.getDefaultProvider('rinkeby');
  const ethersProvider = new ethers.providers.JsonRpcProvider("https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");

  // create ethereum wallet using ethers.js
  const ethWallet = new ethers.Wallet(PRIVATE,ethersProvider);
  // derive zksync.Signer from ethereum wallet
  const syncWallet = await zksync.Wallet.fromEthSigner(ethWallet, syncProvider);

  // send funds from Ethereum to L2
  console.log('Sending funds to zkSync...')

  const deposit = await syncWallet.depositToSyncFromEthereum({
    depositTo: syncWallet.address(),
    token: 'ETH',
    amount: ethers.utils.parseEther('0.01')
  });

  // await receipt (transaction is in committed state)
  await deposit.awaitReceipt();
  console.log('Funds sent to zkSync');

  // unlock L2 account if locked
  if (!(await syncWallet.isSigningKeySet())) {
    if ((await syncWallet.getAccountId()) == undefined) {
      throw new Error('Unknown account');
    }

    const changePubkey = await syncWallet.setSigningKey({
      feeToken: 'ETH',
      ethAuthType: 'ECDSA'
    });

    await changePubkey.awaitReceipt();
  }

  // get L2 balance
  const committedETHBalance = await syncWallet.getBalance('ETH');
  console.log('zkSync balance: ' + committedETHBalance);

  // mint NFT
  console.log("Minting new NFT...");
  const contentHash = "0x" + "d117e0c7d661719264cb73c5cb85763c10ca43a1d0d5b3dc378250a6fea1a5ed";
  const nft = await syncWallet.mintNFT({
    recipient: syncWallet.address(),
    contentHash,
    feeToken: 'ETH',
    //fee
  });

  await nft.awaitReceipt();

  // get freshly minted tokenId
  const state = await syncWallet.getAccountState();
  let tokenId = Object.keys(state.committed.nfts)[Object.keys(state.committed.nfts).length-1];
  console.log("NFT minted with id: " + tokenId);

  const withdraw = await syncWallet.withdrawNFT({
    to: ethWallet.address,
    token: parseInt(tokenId),
    feeToken: 'ETH',
    fastProcessing: true
  });

  // send NFT to L1
  console.log("Sending NFT to L1...");
  await withdraw.awaitVerifyReceipt();
  console.log("NFT sent to L1 address: " + ethWallet.address);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
