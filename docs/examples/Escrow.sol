// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
  address public immutable payer;
  address public immutable payee;
  uint256 public immutable releaseAt;

  constructor(address payee_, uint256 delaySeconds) payable {
    payer = msg.sender;
    payee = payee_;
    releaseAt = block.timestamp + delaySeconds;
  }

  function release() external {
    require(msg.sender == payee, "only payee");
    require(block.timestamp >= releaseAt, "too early");

    (bool sent, ) = payee.call{ value: address(this).balance }("");
    require(sent, "transfer failed");
  }
}
