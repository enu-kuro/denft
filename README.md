# deNFT, a bridge for NFT collections over the deBridge protocol

deNFT is a set of smart contracts that aims to provide the ability to bridge arbitrary ERC-721-compliant NFTs across EVM blockchains leveraging the deBridge low-level cross chain messaging protocol. This set is responsible for operating NFT objects and constructing messages tailored to operate these NFTs across chains using specially constructed messages, while the actual transfer of such messages is handled by the deBridge gate.

Designing deNFT we had an intention to implement two different approaches under one roof:
1. the IOU (I-owe-you, lock/wrap) approach: an object is being locked by the bridge on the origin chain, and the wrapper object is being minted on the destination chain
2. the burn/mint approach: the object is being burned on the origin chain and the same object (with the same set of parameters) gets minted on the destination chain.

The following contracts are used in the implementation:
- `NFTBridge`, a contract which is responsible for:
  - when sending an object to the bridge: taking it from the sender, holding in on it’s own address or burning it, constructing operational message for the target chain;
  - when receiving an object from the bridge: releasing an object (if on native chain) or minting a new one or creating a wrapped version of the original one, then sending it to the destination address;
- `DeNFT`, a factory contract which implements generic ERC-721-compliant NFT collection, used to create wrapper collections for wrapped objects as well as original collections for cross-chain compatible objects;
- `DeBridgeNFTDeployer`, a helper contract for deploying DeNFT instances;
- `ERC721WithPermitUpgradable`, an abstract extension for OpenZeppelin’s ERC721Upgradeable contract with EIP-4494-compliant permits implementation (based on the reference implementation of the EIP-4494).