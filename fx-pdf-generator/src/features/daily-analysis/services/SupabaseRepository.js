const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

class SupabaseRepository {
    constructor() {
        this.supabase = null;
        if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
            this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        } else {
            console.warn("⚠️ Missing SUPABASE_URL or SUPABASE_KEY. Database features disabled.");
        }
    }

    async saveReport(reportData) {
        /**
         * reportData: { 
         *  filename: string, 
         *  url: string, 
         *  size: string, 
         *  type: 'pdf' | 'html', 
         *  metadata: object (optional) 
         * }
         */
        if (!this.supabase) return null;

        try {
            const { data, error } = await this.supabase
                .from('daily_fx_reports')
                .insert([reportData])
                .select();

            if (error) {
                console.error("❌ Supabase Insert Error:", error.message);
                throw error;
            }
            console.log("✅ Saved to Database:", reportData.filename);
            return data;
        } catch (err) {
            console.error("Database save failed:", err.message);
            // Don't crash app if DB save fails
            return null;
        }
    }

    async getReports(limit = 20) {
        if (!this.supabase) return [];

        try {
            const { data, error } = await this.supabase
                .from('daily_fx_reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Failed to fetch reports from DB:", err.message);
            return [];
        }
    }
}

module.exports = new SupabaseRepository();
