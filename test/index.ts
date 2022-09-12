import { DeBridgeGate } from "@debridge-finance/hardhat-debridge/dist/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deBridge, ethers, upgrades } from "hardhat";
import { DeBridgeNFTDeployer, NFTBridge } from "../typechain-types";

interface TestSuiteState {
  owner: SignerWithAddress;
  user1: SignerWithAddress;
  gate: DeBridgeGate;
  gateProtocolFee: BigNumber;
  nftBridge: NFTBridge;
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
    deBridgeNFTDeployer,
  };
}

describe("deNFT", function () {
  let states: TestSuiteState;
  before(async () => {
    states = await deployContracts();
  });

  it("mint deNFT", async function () {
    const { owner, user1, nftBridge, deBridgeNFTDeployer } = states;
    const tx = await nftBridge.createNFT(
      owner.address,
      "Original NFT",
      "ORGNL",
      ""
    );
    const receipt = await tx.wait();
    const deNFTAddress = receipt
      .logs!.flatMap((log) =>
        log.address === deBridgeNFTDeployer.address
          ? deBridgeNFTDeployer.interface.parseLog(log)
          : []
      )
      .find((event) => {
        return event.name === "NFTDeployed";
      })!.args.asset as string;

    const DeNFTFactory = await ethers.getContractFactory("DeNFT");
    const deNFT = DeNFTFactory.attach(deNFTAddress);

    await deNFT.connect(owner).mint(user1.address, 0, "");
    expect(await (await deNFT.balanceOf(user1.address)).toNumber()).equal(1);
  });
});
