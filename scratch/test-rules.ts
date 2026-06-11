import { RulesEngine } from '../packages/services/src/RulesEngine';
import { db } from '@repo/db';

async function testRules() {
  console.log("🚀 Đang khởi động trình kiểm thử Rule local cho TOÀN BỘ tài khoản...");
  
  try {
    // 1. Lấy tất cả các tài khoản quảng cáo
    const accounts = await db.query.adsAccounts.findMany();
    
    if (accounts.length === 0) {
      console.error("❌ Không tìm thấy tài khoản quảng cáo nào trong Database.");
      return;
    }

    console.log(`📊 Tìm thấy ${accounts.length} tài khoản. Bắt đầu quét...\n`);

    const isDryRun = true; 
    
    for (const account of accounts) {
      console.log(`--------------------------------------------------`);
      console.log(`🔍 Tài khoản: ${account.name} (${account.customerId})`);
      
      try {
        await RulesEngine.runAccountOptimization(
          account.userId, 
          account.id, 
          account.customerId, 
          isDryRun
        );
      } catch (err: any) {
        console.error(`❌ Lỗi khi quét tài khoản ${account.name}:`, err.message);
      }
    }

    console.log(`\n==================================================`);
    console.log("✅ Hoàn tất kiểm tra toàn bộ hệ thống.");
    
  } catch (error) {
    console.error("❌ Lỗi hệ thống:", error);
  }
}

testRules().then(() => process.exit(0));
