import { DeBridgeGate } from "@debridge-finance/hardhat-debridge/dist/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract } from "ethers";
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
async function sign(
  name: string,
  nftAddress: string,
  spender: string,
  tokenId: number,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: number,
  signer: SignerWithAddress
) {
  const typedData = {
    types: {
      Permit: [
        { name: "spender", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: name,
      version: "1",
      chainId: chainId,
      verifyingContract: nftAddress,
    },
    message: {
      spender,
      tokenId,
      nonce,
      deadline,
    },
  };

  // sign Permit
  const signature = await signer._signTypedData(
    typedData.domain,
    { Permit: typedData.types.Permit },
    typedData.message
  );

  return signature;
}
async function deployContracts(): Promise<TestSuiteState> {
  const [owner, user1] = await ethers.getSigners();
  const gate = await deBridge.emulator.deployGate();

  const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");
  const nftBridge = (await upgrades.deployProxy(NFTBridgeFactory, [
    gate.address,
  ])) as NFTBridge;

  // There is only 1 chain in emulated environment...
  await nftBridge.addChainSupport(
    nftBridge.address,
    ethers.provider.network.chainId
  );

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

    const tokenId = 0;
    await deNFT.connect(owner).mint(user1.address, tokenId, "");
    expect(await (await deNFT.balanceOf(user1.address)).toNumber()).equal(1);

    const deadline = ethers.constants.MaxUint256;
    const signature = await sign(
      await deNFT.name(),
      deNFTAddress,
      nftBridge.address,
      tokenId,
      await deNFT.nonces(tokenId),
      deadline,
      ethers.provider.network.chainId,
      user1
    );
    const chainIdTo = ethers.provider.network.chainId;
    const tx2 = await nftBridge.send(
      deNFTAddress,
      tokenId,
      deadline,
      signature,
      chainIdTo,
      user1.address,
      0,
      0
    );
    const receipt2 = await tx2.wait();
  });
});
