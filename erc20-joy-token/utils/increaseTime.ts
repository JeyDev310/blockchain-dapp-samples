import { network } from 'hardhat'

export async function increaseTime(value: number) {
    try {
        await network.provider.send('evm_increaseTime', [value]);
        await network.provider.send('evm_mine');
    } catch (error) {
        console.log('error', error)
    }
}