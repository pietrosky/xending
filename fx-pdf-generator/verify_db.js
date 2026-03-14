const repo = require('./src/features/daily-analysis/services/SupabaseRepository');

async function test() {
    console.log("Testing DB Connection...");
    try {
        const res = await repo.saveReport({
            filename: `TEST_DB_CONNECT_${Date.now()}.txt`,
            url: '/test',
            type: 'pdf',
            size: '0 KB',
            metadata: { source: 'VerificationScript' }
        });

        if (res && res.error) {
            console.error("❌ Save Failed:", res.error);
        } else {
            console.log("✅ Save Success detected");
        }

        const list = await repo.getReports(5);
        console.log("Recent Reports (Count):", list.length);
        console.log("First Report:", list[0]);
    } catch (e) {
        console.error("❌ Critical Error:", e);
    }
}

test();
