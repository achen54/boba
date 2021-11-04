/*
Copyright 2019-present OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import React, { useState, useEffect } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { depositL2LP, fastExitAll } from 'actions/networkAction'
import { openAlert } from 'actions/uiAction'

import { selectLoading } from 'selectors/loadingSelector'
import { selectSignatureStatus_exitLP } from 'selectors/signatureSelector'
import { selectLookupPrice } from 'selectors/lookupSelector'

import Button from 'components/button/Button'
import Input from 'components/input/Input'

import { amountToUsd, logAmount, toWei_String } from 'util/amountConvert'

import { Typography, useMediaQuery } from '@material-ui/core'
import { useTheme } from '@emotion/react'
import { WrapperActionsModal } from 'components/modal/Modal.styles'
import { Box } from '@material-ui/system'

import BN from 'bignumber.js'
import { fetchFastExitCost, fetchL1LPBalance, fetchL1TotalFeeRate, fetchL2FeeBalance,fetchL1LPLiquidity } from 'actions/balanceAction'
import { selectL1FeeRate, selectL1GasFee, selectL1LPBalanceString, selectL2FeeBalance, selectL1LPLiquidity } from 'selectors/balanceSelector'

function DoExitStepFast({ handleClose, token }) {

  const dispatch = useDispatch()

  const [ value, setValue ] = useState('')
  const [ value_Wei_String, setValue_Wei_String ] = useState('0')

  const [ LPRatio, setLPRatio ] = useState(0)

  const LPBalance = useSelector(selectL1LPBalanceString)
  const LPLiquidity = useSelector(selectL1LPLiquidity)
  const feeRate = useSelector(selectL1FeeRate)
  const l1gas = useSelector(selectL1GasFee)
  const l2FeeBalance = useSelector(selectL2FeeBalance)

  const [ validValue, setValidValue ] = useState(false)

  const loading = useSelector(selectLoading(['EXIT/CREATE']))

  const lookupPrice = useSelector(selectLookupPrice)
  const signatureStatus = useSelector(selectSignatureStatus_exitLP)

  const maxValue = logAmount(token.balance, token.decimals)

  function setAmount(value) {

    const tooSmall = new BN(value).lte(new BN(0.0))
    const tooBig   = new BN(value).gt(new BN(maxValue))

    if (tooSmall || tooBig) {
      setValidValue(false)
    } else if (token.symbol === 'ETH' && (Number(l1gas) + Number(value)) > Number(l2FeeBalance)) {
      //insufficient funds to actually exit
      setValidValue(false)
    } else if ((Number(l1gas) > Number(l2FeeBalance))) {
      //insufficient funds to actually exit
      setValidValue(false)
    } else if (Number(LPRatio) < 0.1) {
      //not enough balance/liquidity ratio
      //we always want some balance for unstaking
      setValidValue(false)
    } else if (Number(value) > Number(LPBalance) * 0.9) {
      //not enough absolute balance
      //we don't want want one large bridge to wipe out all balance
      setValidValue(false)
    } else {
      //Whew, finally!
      setValidValue(true)
    }

    setValue(value)

  }

  // function getLPBalance () {
  //   return Number(logAmount(l1LpBalanceString, token.decimals)).toFixed(3)
  // }

  const receivableAmount = (value) => {
    return (Number(value) * ((100 - Number(feeRate)) / 100)).toFixed(3)
  }

  async function doExit() {

    console.log("Amount to exit:", value_Wei_String)

    let res = await dispatch(
      depositL2LP(
        token.address,
        value_Wei_String
      )
    )

    if (res) {
      dispatch(
          openAlert(
            `${token.symbol} was bridged. You will receive
            ${receivableAmount(value)} ${token.symbol} on L1.`
          )
        )
      handleClose()
    }

  }

  async function doExitAll() {

    console.log("Amount to exit:", token.balance.toString())

    let res = await dispatch(
      fastExitAll(
        token.address
      )
    )

    if (res) {
      dispatch(
          openAlert(
            `${token.symbol} was bridged. You will receive
            ${receivableAmount(value)} ${token.symbol} 
            minus gas fees (if bridging ETH) on L1.`
          )
        )
      handleClose()
    }

  }

  useEffect(() => {
    if (typeof(token) !== 'undefined') {
      dispatch(fetchL1LPBalance(token.addressL1));
      dispatch(fetchL1LPLiquidity(token.addressL1));
      dispatch(fetchL1TotalFeeRate());
      dispatch(fetchFastExitCost(token.address));
      dispatch(fetchL2FeeBalance());      
    }
    // to clean up state and fix the
    // error in console for max state update.
    return ()=>{
      dispatch({type: 'BALANCE/RESET'})
    }
  }, [ token ])

  useEffect(() => {
    if(LPLiquidity > 0){
      const LPR = LPBalance / LPLiquidity
      setLPRatio(Number(LPR).toFixed(3))
    }
  }, [LPLiquidity, LPBalance])

  useEffect(() => {
    if (signatureStatus && loading) {
      //we are all set - can close the window
      //transaction has been sent and signed
      handleClose()
    }
  }, [ signatureStatus, loading, handleClose ])

  const feeLabel = 'There is a ' + feeRate + '% fee.'

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  let buttonLabel = 'Cancel'
  if( loading ) buttonLabel = 'Close'

  let ETHstring = ''
  let warning = false

  if(l1gas && Number(l1gas) > 0) {
    
    if (token.symbol !== 'ETH') {
      if(Number(l1gas) > Number(l2FeeBalance)) {
        warning = true
        ETHstring = `The estimated gas fee for this transaction (approval + bridge) is ${Number(l1gas).toFixed(4)} ETH. 
        WARNING: your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is not sufficient to cover the estimated cost. 
        THIS TRANSACTION WILL FAIL.` 
      } 
      else if(Number(l1gas) > Number(l2FeeBalance) * 0.96) {
        warning = true
        ETHstring = `The estimated gas fee for this transaction (approval + bridge) is ${Number(l1gas).toFixed(4)} ETH. 
        CAUTION: your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is very close to the estimated cost. 
        This transaction might fail. It would be safer to have slightly more ETH in your L2 wallet to cover gas fees.` 
      } 
      else {
        ETHstring = `The estimated gas fee for this transaction (approval + bridge) is ${Number(l1gas).toFixed(4)} ETH. 
        Your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is sufficent to cover this transaction.` 
      }
    }

    if (token.symbol === 'ETH') {
      if((Number(value) + Number(l1gas)) > Number(l2FeeBalance)) {
        warning = true
        ETHstring = `The estimated total of this transaction (amount + approval + bridge) is ${(Number(value) + Number(l1gas)).toFixed(4)} ETH. 
        WARNING: your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is not sufficient to cover this transaction. 
        THIS TRANSACTION WILL FAIL. If you would like to bridge all of your ETH, please use the "BRIDGE ALL" button.` 
      }
      else if ((Number(value) + Number(l1gas)) > Number(l2FeeBalance) * 0.96) {
        warning = true
        ETHstring = `The estimated total of this transaction (amount + approval + bridge) is ${(Number(value) + Number(l1gas)).toFixed(4)} ETH. 
        CAUTION: your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is very close to the estimated total. 
        THIS TRANSACTION MIGHT FAIL. If you would like to bridge all of your ETH, please use the "BRIDGE ALL" button.` 
      } else {
        ETHstring = `The estimated total value of this transaction (amount + approval + bridge) is ${(Number(value) + Number(l1gas)).toFixed(4)} ETH. 
        Your L2 ETH balance of ${Number(l2FeeBalance).toFixed(4)} is sufficent to cover this transaction.` 
      }
    }
  }

  return (
    <>
      <Box>

        <Typography variant="h2" sx={{fontWeight: 700, mb: 1}}>
          Fast Bridge to L1
        </Typography>

        <Typography variant="body2" sx={{mb: 3}}>{feeLabel}</Typography>

        <Input
          label={`Amount to bridge to L1`}
          placeholder="0.0"
          value={value}
          type="number"
          onChange={(i)=>{
            setAmount(i.target.value)
            setValue_Wei_String(toWei_String(i.target.value, token.decimals))
          }}
          unit={token.symbol}
          maxValue={maxValue}
          newStyle
          variant="standard"
          loading={loading}
          onExitAll={doExitAll}
          allowExitAll={true}
        />

        {validValue && token && (
          <Typography variant="body2" sx={{mt: 2}}>
            {value &&
              `You will receive
              ${receivableAmount(value)}
              ${token.symbol}
              ${!!amountToUsd(value, lookupPrice, token) ?  `($${amountToUsd(value, lookupPrice, token).toFixed(2)})`: ''}
              on L1.`
            }
          </Typography>
        )}
        
        {warning && (
          <Typography variant="body2" sx={{mt: 2, color: 'red'}}>
            {ETHstring}
          </Typography>
        )}

        {!warning && (
          <Typography variant="body2" sx={{mt: 2}}>
            {ETHstring}
          </Typography>
        )}

        {Number(LPRatio) < 0.10 && (
          <Typography variant="body2" sx={{mt: 2, color: 'red'}}>
            The pool's balance/liquidity ratio (of {LPRatio}) is too low to cover your fast bridge right now. Please
            use the classic bridge or reduce the amount.
          </Typography>
        )}

        {loading && (
          <Typography variant="body2" sx={{mt: 2}}>
            This window will automatically close when your transaction has been signed and submitted.
          </Typography>
        )}
      </Box>

      <WrapperActionsModal>
        <Button
          onClick={handleClose}
          color='neutral'
          size='large'
        >
          {buttonLabel}
        </Button>
        <Button
          onClick={doExit}
          color='primary'
          variant='contained'
          loading={loading}
          tooltip={loading ? "Your transaction is still pending. Please wait for confirmation." : "Click here to bridge your funds to L1"}
          disabled={!validValue}
          triggerTime={new Date()}
          fullWidth={isMobile}
          size='large'
        >
          Bridge to L1
        </Button>
      </WrapperActionsModal>
    </>
  )
}

export default React.memo(DoExitStepFast)
