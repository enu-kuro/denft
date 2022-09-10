import { DeBridgeGate } from "@debridge-finance/hardhat-debridge/dist/typechain";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { deBridge, ethers, upgrades } from "hardhat";
import { DeBridgeNFTDeployer, DeNFT, NFTBridge } from "../typechain-types";

interface TestSuiteState {
  owner: Signer;
  gate: DeBridgeGate;
  gateProtocolFee: BigNumber;
  nftBridge: NFTBridge;
  deNFT: DeNFT;
  deBridgeNFTDeployer: DeBridgeNFTDeployer;
}

async function deployContracts(): Promise<TestSuiteState> {
  const [owner] = await ethers.getSigners();
  const gate = await deBridge.emulator.deployGate();

  const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");
  const nftBridge = (await upgrades.deployProxy(NFTBridgeFactory, [
    gate.address,
  ])) as NFTBridge;

  const DeNFTFactory = await ethers.getContractFactory("DeNFT");
  const deNFT = (await upgrades.deployProxy(DeNFTFactory, [
    "",
    "",
    "",
    owner.address,
    nftBridge.address,
  ])) as DeNFT;

  const DeBridgeNFTDeployerFactory = await ethers.getContractFactory(
    "DeBridgeNFTDeployer"
  );
  const deBridgeNFTDeployer = (await upgrades.deployProxy(
    DeBridgeNFTDeployerFactory,
    [deNFT.address, nftBridge.address]
  )) as DeBridgeNFTDeployer;

  return {
    owner,
    gate,
    gateProtocolFee: await gate.globalFixedNativeFee(),
    nftBridge,
    deNFT,
    deBridgeNFTDeployer,
  };
}

describe("deNFT", function () {
  let states: TestSuiteState;
  before(async () => {
    states = await deployContracts();
  });

  it("mint", async function () {});
});
