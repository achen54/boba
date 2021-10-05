/* External Imports */
import { ethers } from 'ethers'
import { Provider, TransactionReceipt } from '@ethersproject/abstract-provider'

export interface Layer {
  provider: Provider
  messengerAddress: string
}

export interface WatcherOptions {
  l1: Layer
  l2: Layer
}

export class Watcher {
  public NUM_BLOCKS_TO_FETCH: number = 10000

  public l1: Layer
  public l2: Layer

  constructor(opts: WatcherOptions) {
    this.l1 = opts.l1
    this.l2 = opts.l2
  }

  public async getMessageHashesFromL1Tx(l1TxHash: string): Promise<string[]> {
    return this.getMessageHashesFromTx(this.l1, l1TxHash)
  }

  public async getMessageHashesFromL2Tx(l2TxHash: string): Promise<string[]> {
    return this.getMessageHashesFromTx(this.l2, l2TxHash)
  }

  public async getL1TransactionReceipt(
    l2ToL1MsgHash: string,
    pollForPending: boolean = true
  ): Promise<TransactionReceipt> {
    //console.log(' Calling getL1TransactionReceipt')
    return this.getTransactionReceipt(this.l1, l2ToL1MsgHash, pollForPending)
  }

  public async getL2TransactionReceipt(
    l1ToL2MsgHash: string,
    pollForPending: boolean = true
  ): Promise<TransactionReceipt> {
    //console.log(' Calling getL2TransactionReceipt')
    return this.getTransactionReceipt(this.l2, l1ToL2MsgHash, pollForPending)
  }

  public async getMessageHashesFromTx(
    layer: Layer,
    txHash: string
  ): Promise<string[]> {
    const receipt = await layer.provider.getTransactionReceipt(txHash)

    if (!receipt) {
      return []
    }

    const msgHashes = []
    const sentMessageEventId = ethers.utils.id(
      'SentMessage(address,address,bytes,uint256,uint256)'
    )
    const l2CrossDomainMessengerRelayAbi = [
      'function relayMessage(address _target,address _sender,bytes memory _message,uint256 _messageNonce)',
    ]
    const l2CrossDomainMessengerRelayinterface = new ethers.utils.Interface(
      l2CrossDomainMessengerRelayAbi
    )

    for (const log of receipt.logs) {
      if (
        log.address === layer.messengerAddress &&
        log.topics[0] === sentMessageEventId
      ) {
        const [sender, message, messageNonce] =
          ethers.utils.defaultAbiCoder.decode(
            ['address', 'bytes', 'uint256'],
            log.data
          )

        const [target] = ethers.utils.defaultAbiCoder.decode(
          ['address'],
          log.topics[1]
        )

        const encodedMessage =
          l2CrossDomainMessengerRelayinterface.encodeFunctionData(
            'relayMessage',
            [target, sender, message, messageNonce]
          )

        msgHashes.push(
          ethers.utils.solidityKeccak256(['bytes'], [encodedMessage])
        )
      }
    }

    return msgHashes
  }

  public async getTransactionReceipt(
    layer: Layer,
    msgHash: string,
    pollForPending: boolean = true
  ): Promise<TransactionReceipt> {
    //console.log(" Watcher::getTransactionReceipt")

    const blockNumber = await layer.provider.getBlockNumber()
    const startingBlock = Math.max(blockNumber - this.NUM_BLOCKS_TO_FETCH, 0)

    const successFilter: ethers.providers.Filter = {
      address: layer.messengerAddress,
      topics: [ethers.utils.id(`RelayedMessage(bytes32)`)],
      fromBlock: startingBlock,
    }
    const failureFilter: ethers.providers.Filter = {
      address: layer.messengerAddress,
      topics: [ethers.utils.id(`FailedRelayedMessage(bytes32)`)],
      fromBlock: startingBlock,
    }
    const successLogs = await layer.provider.getLogs(successFilter)
    const failureLogs = await layer.provider.getLogs(failureFilter)
    const logs = successLogs.concat(failureLogs)
    const matches = logs.filter(
      (log: ethers.providers.Log) => log.topics[1] === msgHash
    )
    console.log('matches')

    console.log(matches)
    // Message was relayed in the past
    if (matches.length > 0) {
      if (matches.length > 1) {
        throw Error(
          ' Found multiple transactions relaying the same message hash.'
        )
      }
      return layer.provider.getTransactionReceipt(matches[0].transactionHash)
    }

    if (!pollForPending) {
      return Promise.resolve(undefined)
    }

    // Message has yet to be relayed, poll until it is found
    return new Promise(async (resolve, reject) => {
      //console.log(" Watcher polling::layer.provider.getTransactionReceipt pre filter")
      //listener that triggers on filter event
      layer.provider.on(filter, async (log: any) => {
        //console.log(" Watcher polling::layer.provider.getTransactionReceipt post filter")
        //console.log(log)
        if (log.data === msgHash) {
          try {
            const txReceipt = await layer.provider.getTransactionReceipt(
              log.transactionHash
            )
            layer.provider.off(filter)
            resolve(txReceipt)
          } catch (e) {
            reject(e)
          }
        }
      })
    })
  }
}
