
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { depositErc20ToL1 } from 'actions/networkAction'
import { setActiveHistoryTab } from 'actions/uiAction'

import Button from 'components/button/Button'
import Input from 'components/input/Input'

import { selectLoading } from 'selectors/loadingSelector'
import { selectSignatureStatus_depositTRAD } from 'selectors/signatureSelector'
import {
  amountToUsd, logAmount,
  // toWei_String
} from 'util/amountConvert'

import { selectLookupPrice } from 'selectors/lookupSelector'
import { Box, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@emotion/react'
import { WrapperActionsModal } from 'components/modal/Modal.styles'

import BN from 'bignumber.js'
import Select from 'components/select/Select'

function InputStepMultiChain({ handleClose, token, isBridge, openTokenPicker }) {

  const options = [
    { value: 'BNB', label: 'BNB', title: 'BNB' },
    { value: 'AVALANCHE', label: 'Avalanche', title: 'Avalanche' },
    { value: 'FANTOM', label: 'Fantom', title: 'Fantom' },
    { value: 'MOONBEAM', label: 'Moonbeam', title: 'Moonbeam' }
  ]

  const dispatch = useDispatch()

  const [ value, setValue ] = useState('')
  const [ altL1Bridge, setAltL1Bridge ] = useState('')
  // const [ value_Wei_String, setValue_Wei_String ] = useState('0')  //support for Use Max

  const [ validValue, setValidValue ] = useState(false)
  const depositLoading = useSelector(selectLoading([ 'DEPOSIT/CREATE' ]))

  const signatureStatus = useSelector(selectSignatureStatus_depositTRAD)
  const lookupPrice = useSelector(selectLookupPrice)

  const maxValue = logAmount(token.balance, token.decimals)

  function setAmount(value) {

    const tooSmall = new BN(value).lte(new BN(0.0))
    const tooBig = new BN(value).gt(new BN(maxValue))

    if (tooSmall || tooBig) {
      setValidValue(false)
    } else {
      setValidValue(true)
    }

    setValue(value)
  }

  async function doDeposit() {

    const res = await dispatch(depositErc20ToL1(
      // pass required params.
      {
        value: value,
        type: altL1Bridge
      }
    ))

    console.log(res);
    /**
     * TODO:
     *  - dispatch alt L1 specific functions.
     *
     *
    */
    /*
        if(token.symbol === 'ETH') {
          //console.log("Bridging ETH to L2")
          res = await dispatch(
            depositETHL2(value_Wei_String)
          )
        } else {
          //console.log("Bridging ERC20 to L2")
          res = await dispatch(
            depositErc20(value_Wei_String, token.address, token.addressL2)
          )
        } */
    if (res) {
      dispatch(setActiveHistoryTab('Bridge between L1s'))
      handleClose()
    }

  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    if (signatureStatus && depositLoading) {
      //we are all set - can close the window
      //transaction has been sent and signed
      handleClose()
    }
  }, [ signatureStatus, depositLoading, handleClose ])

  let buttonLabel_1 = 'Cancel'
  if (depositLoading) buttonLabel_1 = 'Close'

  let convertToUSD = false

  if (Object.keys(lookupPrice) &&
    !!value &&
    validValue &&
    !!amountToUsd(value, lookupPrice, token)
  ) {
    convertToUSD = true
  }

  if (Number(logAmount(token.balance, token.decimals)) === 0) {
    //no token in this account
    return (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'yellow' }}>
          Sorry, nothing to deposit - no {token.symbol} in this wallet
        </Typography>
        <Button
          onClick={handleClose}
          disabled={false}
          variant='outlined'
          color='primary'
          size='large'
        >
          Cancel
        </Button>
      </Box>)
  }

  const onBridgeChange = (e) => {
    setAltL1Bridge(e.target.value)
  }

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? '#282828' : '#909090',
    }),
  }

  return (
    <>
      <Box>
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 3 }}>
          Bridge {token && token.symbol ? token.symbol : ''} to Alt L1s
        </Typography>

        <Box display="flex" fullWidth py={2} flexDirection="column"
        >
          <Select
            options={options}
            label="Select Alt L1 Bridge"
            onSelect={onBridgeChange}
            styles={customStyles}
            sx={{ marginBottom: '20px' }}
            value={altL1Bridge}
          />
        </Box>

        <Input
          label="Amount to bridge to alt L1s"
          placeholder="0.0"
          value={value}
          type="number"
          onChange={(i) => {
            setAmount(i.target.value)
            // setValue_Wei_String(toWei_String(i.target.value, token.decimals))
          }}
          onUseMax={(i) => {//they want to use the maximum
            setAmount(maxValue) //so the input value updates for the user - just for display purposes
            // setValue_Wei_String(token.balance.toString()) //this is the one that matters
          }}
          allowUseAll={true}
          unit={token.symbol}
          maxValue={maxValue}
          variant="standard"
          newStyle
          isBridge={isBridge}
          openTokenPicker={openTokenPicker}
        />

        {!!convertToUSD && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {`Amount in USD ${amountToUsd(value, lookupPrice, token).toFixed(2)}`}
          </Typography>
        )}

        {!!token && token.symbol === 'OMG' && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            NOTE: The OMG Token was minted in 2017 and it does not conform to the ERC20 token standard.
            In some cases, three interactions with MetaMask are needed. If you are bridging out of a
            new wallet, it starts out with a 0 approval, and therefore, only two interactions with
            MetaMask will be needed.
          </Typography>
        )}

      </Box>
      <WrapperActionsModal>
        <Button
          onClick={handleClose}
          disabled={false}
          variant='outlined'
          color='primary'
          size='large'
        >
          {buttonLabel_1}
        </Button>
        <Button
          onClick={doDeposit}
          color='primary'
          size="large"
          variant="contained"
          loading={depositLoading}
          tooltip={depositLoading ? "Your transaction is still pending. Please wait for confirmation." : "Click here to bridge your funds to L2"}
          disabled={!validValue}
          triggerTime={new Date()}
          fullWidth={isMobile}
        >
          Bridge
        </Button>
      </WrapperActionsModal>
    </>
  )
}

export default React.memo(InputStepMultiChain)