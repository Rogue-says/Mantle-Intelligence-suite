import { test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useILCalculator, calculateIL } from '../src/hooks/useILCalculator.js'
import { usePnL } from '../src/hooks/usePnL.js'
import { buildApproval } from '../src/hooks/useTxBuilder.js'
import { Interface } from 'ethers'
function hook(useHook) { let result; function Capture() { result = useHook(); return null } renderToStaticMarkup(React.createElement(Capture)); return result }
test('IL uses the current holding value, not only its profit', () => {
  const calculator = hook(useILCalculator)
  const params = {amountA:1, amountB:100, entryPriceA:100, entryPriceB:1, currentPriceA:200, currentPriceB:1,feeApr:0,daysHolding:30}
  const result = calculator.compareLPvsHold(params)
  assert.equal(result.holdStrategy.pnl,'100.00')
  assert.equal(result.lpStrategy.pnl,'82.84')
  assert.equal(result.lpStrategy.ilCost,'17.16')
  assert.throws(() => calculator.compareLPvsHold({...params,amountB:50}), /50\/50/)
})
test('rejects invalid ratios and represents impossible break-even', () => {
  assert.equal(calculateIL(1),0)
  assert.throws(() => calculateIL(-1))
  assert.equal(hook(useILCalculator).estimateILForPriceChange(50,0,30).breakEvenDays,null)
})
test('a zero market price produces a full loss', () => {
  let data = null
  globalThis.localStorage = {getItem:()=>data,setItem:(_,value)=>{data=value}}
  const pnl = hook(usePnL)
  pnl.addEntry({symbol:'MNT',amount:10,entryPrice:2})
  const result = pnl.calculatePortfolioPnL({MNT:0})
  assert.equal(result.summary.totalPnl,'-20.00')
  assert.equal(result.summary.totalPnlPercent,'-100.00%')
})
test('approval contains ABI-encoded calldata with exact integer amounts', () => {
  const tx=buildApproval({tokenAddress:'0x1111111111111111111111111111111111111111',spenderAddress:'0x2222222222222222222222222222222222222222',amount:'123456789012345678901'})
  const decoded = new Interface(['function approve(address,uint256)']).decodeFunctionData('approve',tx.data)
  assert.equal(decoded[1],123456789012345678901n)
  assert.throws(()=>buildApproval({amount:1}),/integer string/)
})
