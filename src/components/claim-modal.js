import { Modal, Button, Spin } from 'antd'
import Web3 from '../bootstrap/web3'
import MerkleRedeem from '../../node_modules/@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json'

import React, { useState, useEffect } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'
import { ReactComponent as Kleros } from '../assets/images/kleros.svg'

import { ReactComponent as RightArrow } from '../assets/images/right-arrow.svg'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const ClaimModal = ({
  visible,
  onOk,
  onCancel,
  displayButton,
  apyCallback
}) => {
  const { drizzle } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3
  }))

  const [claims, setClaims] = useState(0)
  const [txHash, setTxHash] = useState(null)
  const [claimStatus, setClaimStatus] = useState(0)
  const [modalState, setModalState] = useState(0)
  const [currentClaimValue, setCurrentClaimValue] = useState(12)

  const CONTRACT_ADDRESSES = {
    1: '0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38',
    42: '0x193353d006Ab015216D34419a845989e76612475'
  }

  const SNAPSHOTS = [
    'https://ipfs.kleros.io/ipfs/QmYJGrQBh68kAvqk57FdynEixdu4VY87mHme821rtPS92u/snapshot-1.json',
    'https://ipfs.kleros.io/ipfs/QmUCTdvyAWU8eEV1nwgiF7CwKpL5FnXiDxGD9FedFdrHYU/snapshot-2021-03.json',
    'https://ipfs.kleros.io/ipfs/QmXG2EKcd3tyMwoxhrqmBAu7gsrzgF3jCde75CjQzmg1Am/snapshot-2021-04.json'
  ]

  const claimObjects = claims => {
    if (claims.length > 0)
      return claims
        .map(
          (claim, index) =>
            claim && {
              week: index,
              balance: claim.value.hex,
              merkleProof: claim.proof
            }
        )
        .filter(claimObject => typeof claimObject !== 'undefined')
  }

  useEffect(() => {
    var responses = []
    for (var month = 0; month < SNAPSHOTS.length; month++) {
      responses[month] = fetch(SNAPSHOTS[month])
    }
    const results = Promise.all(
      responses.map(promise =>
        promise.then(r => r.json()).catch(e => console.error(e))
      )
    )

    fetch('https://api.thegraph.com/subgraphs/name/napolean0/kleros', {
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
    {
      totalStakeds {
        totalStakedAmount
      }
    }
        `
      }),
      method: 'POST',
      mode: 'cors'
    })
      .then(r => r.json())
      .then(r =>
        apyCallback(
          drizzle.web3.utils.fromWei(r.data.totalStakeds[0].totalStakedAmount)
        )
      )
      .catch(err => {
        console.error(err)
        console.log('Falling back to last merkle tree for calculating apy')
        results.then(trees =>
          apyCallback(
            drizzle.web3.utils.fromWei(
              trees.slice(-1)[0].averageTotalStaked.hex
            )
          )
        )
      })

    setClaims(0)
    results.then(r =>
      r.forEach(function(item) {
        if (item) {
          apyCallback(item.apy)
          if (item.merkleTree.claims[drizzleState.account]) displayButton()
          setClaims(prevState => {
            if (prevState)
              return [
                ...prevState,
                item.merkleTree.claims[drizzleState.account]
              ]
            else return [item.merkleTree.claims[drizzleState.account]]
          })
        } else
          setClaims(prevState => {
            if (prevState) return [...prevState, 0]
            else return [0]
          })
      })
    )

    const contract = new Web3.eth.Contract(
      MerkleRedeem.abi,
      CONTRACT_ADDRESSES[drizzleState.web3.networkId]
    )
    const claimStatus = contract.methods
      .claimStatus(drizzleState.account, 0, 12)
      .call()

    //

    claimStatus.then(r => setClaimStatus(r))
  }, [drizzleState.account, drizzleState.web3.networkId, modalState])

  const handleClaim = () => {
    setModalState(1)

    const tx = claimWeeks(claims)
    tx.on('transactionHash', function(hash) {
      setTxHash(hash)
    })

    tx.then(handleClaimed).catch(err => {
      setModalState(0)
    })
  }

  const handleClaimed = () => {
    setModalState(2)
  }

  const handleCancel = () => {
    setModalState(0)
    onCancel()
  }

  const getTotalClaimable = claims => {
    const unclaimedItems = claims
      .filter((claim, index) => Boolean(claimStatus[index]) === false)
      .map(claim => drizzle.web3.utils.toBN(claim ? claim.value.hex : '0x0'))

    let totalClaimable

    if (unclaimedItems.length > 0) {
      totalClaimable = unclaimedItems.reduce(function(
        accumulator,
        currentValue,
        currentIndex,
        array
      ) {
        return accumulator.add(currentValue)
      })
    } else totalClaimable = '0'
    return totalClaimable
  }
  const getTotalRewarded = claims =>
    claims
      .map(claim => drizzle.web3.utils.toBN(claim ? claim.value.hex : '0x0'))
      .reduce(function(accumulator, currentValue, currentIndex, array) {
        return accumulator.add(currentValue)
      })

  const claimWeeks = claims => {
    const contract = new Web3.eth.Contract(
      MerkleRedeem.abi,
      CONTRACT_ADDRESSES[drizzleState.web3.networkId]
    )
    const args = claimObjects(claims).filter(
      (_claim, index) => Boolean(claimStatus[index]) === false
    )

    setCurrentClaimValue(
      args
        .map(claim => drizzle.web3.utils.toBN(claim ? claim.balance : '0x0'))
        .reduce((a, b) => {
          return a.add(b)
        }, drizzle.web3.utils.toBN('0x0'))
    )

    return contract.methods
      .claimWeeks(drizzleState.account, args)
      .send({ from: drizzleState.account })
  }

  return (
    <Modal
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'black',
        padding: '56px'
      }}
      centered
      keyboard
      okText="Claim Your PNK Tokens"
      onOk={onOk}
      onCancel={handleCancel}
      visible={visible}
      width="800px"
      footer={null}
    >
      {modalState === 1 && <Spin size="large" />}
      {(modalState === 0 || modalState === 2) && (
        <Kleros style={{ maxWidth: '100px', maxHeight: '100px' }} />
      )}
      {modalState >= 1 && (
        <div style={{ fontSize: '24px', marginTop: '24px' }}>
          {modalState === 1 ? 'Claiming' : '🎉 Claimed 🎉'}
        </div>
      )}
      <div
        style={{
          fontSize: '64px',
          fontWeight: '500',
          color: '#9013FE',
          marginBottom: '24px'
        }}
      >
        {' '}
        {claims.length > 0 &&
          claimStatus.length > 0 &&
          (modalState === 2
            ? Number(drizzle.web3.utils.fromWei(currentClaimValue)).toFixed(0)
            : Number(
                drizzle.web3.utils.fromWei(getTotalClaimable(claims))
              ).toFixed(0))}{' '}
        PNK{' '}
      </div>
      {modalState === 0 && (
        <>
          <div style={{ fontSize: '24px', fontWeight: '400' }}>
            <span role="img" aria-label="fireworks">
              🎉
            </span>{' '}
            Thanks for being part of the community!{' '}
            <span role="img" aria-label="fireworks">
              🎉
            </span>
          </div>
          <div
            style={{ fontSize: '24px', fontWeight: '500', marginTop: '8px' }}
          >
            As a Kleros Juror, you will earn PNK for staking in Court.
          </div>

          <div
            style={{
              fontSize: '24px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0px 2px 3px  rgba(0, 0, 0, 0.06)',
              borderRadius: '18px',
              padding: '24px 32px',
              width: '100%',
              marginTop: '24px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>Total Rewarded PNK:</div>
              <div style={{ fontWeight: '500', textAlign: 'right' }}>
                {claims &&
                  Number(
                    drizzle.web3.utils.fromWei(getTotalRewarded(claims))
                  ).toFixed(0)}{' '}
                PNK
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>Unclaimed:</div>
              <div
                style={{
                  color: '#9013FE',
                  fontWeight: '500',
                  textAlign: 'right'
                }}
              >
                {claims &&
                  Number(
                    drizzle.web3.utils.fromWei(getTotalClaimable(claims))
                  ).toFixed(0)}{' '}
                PNK
              </div>
            </div>
          </div>
        </>
      )}
      {modalState >= 1 && (
        <hr
          style={{
            width: '100%',
            border: '1px solid rgba(0,0,0,0.1',
            marginBottom: '32px'
          }}
        />
      )}
      {modalState === 2 && (
        <div style={{ fontSize: '18px', fontWeight: '400' }}>
          {' '}
          Thank you for being part of the community!{' '}
        </div>
      )}
      <div style={{ fontSize: '18px', color: '#009AFF' }}>
        {modalState === 0 && (
          <a
            href="https://blog.kleros.io/the-launch-of-the-kleros-juror-incentive-program/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more about Justice Farming{' '}
            <RightArrow
              style={{ marginLeft: '4px', verticalAlign: 'middle' }}
            />
          </a>
        )}

        {modalState === 1 && txHash && (
          <a
            href={`https://${
              Number(drizzleState.web3.networkId) === 42 ? 'kovan.' : ''
            }etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Transaction on Etherscan{' '}
            <RightArrow
              style={{ marginLeft: '4px', verticalAlign: 'middle' }}
            />
          </a>
        )}

        {modalState === 2 && (
          <a
            href="https://blog.kleros.io/the-launch-of-the-kleros-juror-incentive-program/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more about the Juror Incentive Program{' '}
            <RightArrow
              style={{ marginLeft: '4px', verticalAlign: 'middle' }}
            />
          </a>
        )}
      </div>
      {modalState === 0 && claims && (
        <Button
          onClick={handleClaim}
          size="large"
          type="primary"
          style={
            !claims ||
            Number(
              drizzle.web3.utils.fromWei(getTotalClaimable(claims))
            ).toFixed(0) < 1
              ? {
                  marginTop: '40px',
                  border: 'none',
                  color: '#CCC',
                  backgroundColor: '#fafafa'
                }
              : {
                  marginTop: '40px',
                  backgroundColor: '#9013FE',
                  color: 'white',
                  border: 'none'
                }
          }
          disabled={
            !claims ||
            Number(
              drizzle.web3.utils.fromWei(getTotalClaimable(claims))
            ).toFixed(0) < 1
          }
        >
          Claim Your PNK Tokens
        </Button>
      )}
    </Modal>
  )
}

ClaimModal.propTypes = {}

export default ClaimModal
