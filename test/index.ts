import { DeBridgeGate } from "@debridge-finance/hardhat-debridge/dist/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deBridge, ethers, upgrades } from "hardhat";
import {
  BeaconProxy,
  DeBridgeNFTDeployer,
  NFTBridge,
} from "../typechain-types";

interface TestSuiteState {
  owner: SignerWithAddress;
  user1: SignerWithAddress;
  gate: DeBridgeGate;
  gateProtocolFee: BigNumber;
  nftBridge: NFTBridge;
  deNFT: BeaconProxy;
  deBridgeNFTDeployer: DeBridgeNFTDeployer;
}

async function deployContracts(): Promise<TestSuiteState> {
  const [owner, user1] = await ethers.getSigners();
  const gate = await deBridge.emulator.deployGate();

  const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");
  const nftBridge = (await upgrades.deployProxy(NFTBridgeFactory, [
    gate.address,
  ])) as NFTBridge;

  const DeNFTFactory = await ethers.getContractFactory("DeNFT");

  const beacon = await upgrades.deployBeacon(DeNFTFactory);
  const deNFT = (await upgrades.deployBeaconProxy(beacon, DeNFTFactory, [
    "",
    "",
    "",
    owner.address,
    nftBridge.address,
  ])) as BeaconProxy;

  const DeBridgeNFTDeployerFactory = await ethers.getContractFactory(
    "DeBridgeNFTDeployer"
  );
  const deBridgeNFTDeployer = (await upgrades.deployProxy(
    DeBridgeNFTDeployerFactory,
    [beacon.address, nftBridge.address]
  )) as DeBridgeNFTDeployer;

  await nftBridge.setNFTDeployer(deBridgeNFTDeployer.address);

  return {
    owner,
    user1,
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

  it("createNFT", async function () {
    const { owner, nftBridge, deBridgeNFTDeployer } = states;
    await expect(
      nftBridge.createNFT(owner.address, "Original NFT", "ORGNL", "")
    ).to.emit(deBridgeNFTDeployer, "NFTDeployed");
  });

  // it("mint", async function () {});
});
