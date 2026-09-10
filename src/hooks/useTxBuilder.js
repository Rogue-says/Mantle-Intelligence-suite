import { useCallback } from 'react'
import { Interface, getAddress, toQuantity } from 'ethers'
const ERC20 = new Interface(['function approve(address spender,uint256 amount) returns (bool)'])

// No guessed protocol addresses or ABI descriptions masquerading as calldata.
export function buildApproval({ tokenAddress, spenderAddress, amount }) {
  if (typeof amount !== 'string' || !/^\d+$/.test(amount)) throw new Error('Amount must be an integer string in token base units')
  const value = BigInt(amount)
  if (value >= 2n ** 256n) throw new Error('Amount exceeds uint256')
  return { to: getAddress(tokenAddress), value: '0x0', chainId: toQuantity(5000),
    data: ERC20.encodeFunctionData('approve', [getAddress(spenderAddress), value]),
    description: 'ERC-20 spending approval; verify the spender before signing' }
}
export function useTxBuilder() {
  const buildTransaction = useCallback((action, params) => {
    if (action !== 'approve') throw new Error('Protocol transactions require a verified address, ABI and quote adapter; not implemented')
    return buildApproval(params)
  }, [])
  const buildBatchTx = useCallback(actions => actions.map(({ action, params }) => {
    try { return { success: true, tx: buildTransaction(action, params) } }
    catch (e) { return { success: false, action, error: e.message } }
  }), [buildTransaction])
  return { buildTransaction, buildBatchTx }
}
