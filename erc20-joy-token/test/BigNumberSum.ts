const BigNumber = require('bignumber.js')

//                           22094708893359100000000001
let lpHolder = new BigNumber(22005808893370100000000000)
let total = new BigNumber(5000000000000000000000000000)
let num = new BigNumber(4999911100000011937313990601)
// let denominator = new BigNumber(10).pow(18)
let answer = total.minus(num)
let final = answer.plus(lpHolder)

console.log('answer', answer.toString())
console.log('final', final.toNumber())