import { ethers } from 'ethers';

console.log('🚀 启动套利机器人...');

const CONFIG = {
  ALCHEMY_WS: 'wss://arb-mainnet.g.alchemy.com/v2/jFkMmwa4Va48ymP96CF6J',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESS: '0x0b8fA2631403e8039a7F40c22786869355B3ee0C',
  POOL_ADDRESS: '0x87E1D001dDAbc465F6446D3658DD52eCb3222B43'
};

class ArbitrageBot {
  constructor() {
    console.log('🤖 初始化机器人...');
    this.start();
  }

  async start() {
    try {
      // 连接到 Alchemy WebSocket
      const provider = new ethers.providers.WebSocketProvider(CONFIG.ALCHEMY_WS);
      const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
      
      console.log('✅ 连接成功');
      console.log('👛 钱包地址:', wallet.address);

      // 合约 ABI
      const contractABI = [
        "function executeArbitrage(uint256 ethAmount) external",
        "function getBotStatus() external view returns (bool enabled, uint256 minETH, uint256 maxETH, uint256 slippage, uint256 count, uint256 profit)"
      ];
      
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, contractABI, wallet);
      console.log('📄 合约加载完成');

      // 监听交易池
      const poolABI = [
        "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
      ];
      
      const poolContract = new ethers.Contract(CONFIG.POOL_ADDRESS, poolABI, provider);

      poolContract.on('Swap', async (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
        if (amount0.gt(0)) {
          const ethAmount = ethers.utils.formatEther(amount0);
          console.log(`\n🔔 检测到交易: ${ethAmount} ETH 买入`);
          
          // 检查是否可以套利
          try {
            const [enabled, minETH, maxETH] = await contract.getBotStatus();
            const ethAmountWei = ethers.BigNumber.from(amount0).abs();
            
            if (enabled && ethAmountWei.gte(minETH) && ethAmountWei.lte(maxETH)) {
              console.log(`🎯 条件满足! 执行套利: ${ethAmount} ETH`);
              const tx = await contract.executeArbitrage(ethAmountWei);
              console.log(`📤 套利交易: ${tx.hash}`);
            } else {
              console.log('⏭️ 条件不满足，跳过');
            }
          } catch (error) {
            console.log('❌ 检查失败:', error.message);
          }
        }
      });

      console.log('🎯 实时监控已启动');
      console.log('💰 监控费用: $0/月');
      console.log('⏰ 开始监听交易...');

    } catch (error) {
      console.log('❌ 启动失败:', error.message);
      // 10秒后重试
      setTimeout(() => this.start(), 10000);
    }
  }
}

// 启动机器人
new ArbitrageBot();
