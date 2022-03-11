import { Wallet,utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

require('dotenv').config();
const PRIVATE = process.env.PRIVATE_KEY || ""; // load private key from .env file

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log('Deployment and interaction with Greeter contract');

  // Initialize the wallet 
  const wallet = new Wallet(PRIVATE);

  // Create deployer object and load the artifact of the contract
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("Greeter");
 
 // Deposit some funds to L2 in order to be able to perform L2 transactions.
  const depositAmount = ethers.utils.parseEther("0.01");
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: utils.ETH_ADDRESS,
    amount: depositAmount
  });
  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();  

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.
  const greeting = "Hi there!";
  const greeterContract = await deployer.deploy(artifact, [greeting]);

  // Show the contract info.
  const contractAddress = greeterContract.address;
  console.log(` ${artifact.contractName} was deployed to ${contractAddress}`);

  //await greeterContract.deployed();
  let oldGreet = await greeterContract.greet();

  console.log(" Current greeting is: " + oldGreet);

  let changeGreetTx = await greeterContract.setGreeting("Ciao bello!");
  await changeGreetTx.wait();

  console.log(" Greet changed with tx: " + changeGreetTx.hash);

  let newGreet = await greeterContract.greet();
  console.log(" Current greeting is: " + newGreet);

}