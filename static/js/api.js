// API 请求封装
const API = {
    endpoints: {
        mmthLatest: '/api/mmth-diamonds/all',
        mmthHistory: '/api/mmth-diamonds/history',
        stats: '/api/stats',
        cave: '/api/cave/stats',
        challenge: '/api/challenge/stats',
        runeTicket: '/api/rune-ticket/stats',
        upgradePanacea: '/api/upgrade-panacea/stats',
        scrape: '/api/scrape/all',
        scrapeStatus: '/api/scrape/status',
        etl: '/api/etl/process',
        etlStatus: '/api/etl/status',
        schedule: '/api/config/schedule'
    },

    async fetch(endpoint) {
        try {
            const res = await fetch(endpoint, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`API error: ${endpoint}`, e);
            return null;
        }
    },

    async post(endpoint) {
        try {
            const res = await fetch(endpoint, { method: 'POST' });
            const text = await res.text();
            if (!text) {
                return { success: res.ok, status: res.status };
            }
            const data = JSON.parse(text);
            // 添加 HTTP 状态码信息
            data._httpStatus = res.status;
            return data;
        } catch (e) {
            console.error(`POST error: ${endpoint}`, e);
            return { error: e.message };
        }
    },

    async put(endpoint, body) {
        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            if (!res.ok) {
                return { error: data.error || `HTTP ${res.status}` };
            }
            return data;
        } catch (e) {
            console.error(`PUT error: ${endpoint}`, e);
            return { error: e.message };
        }
    },

    // MMTH
    async loadMmthLatest() {
        const data = await this.fetch(this.endpoints.mmthLatest);
        if (!data) return { results: [], scrapeTime: '' };
        return {
            results: data.results || [],
            scrapeTime: data.scrape_time || ''
        };
    },

    async loadMmthHistory() {
        const rawData = await this.fetch(this.endpoints.mmthHistory);
        if (!rawData) return {};

        const converted = {};
        for (const [key, records] of Object.entries(rawData)) {
            if (!Array.isArray(records) || records.length === 0) continue;
            const account = records[0].account;
            if (!account) continue;
            converted[account] = records.map(r => ({
                timestamp: r.timestamp,
                total: r.total,
                free: r.free,
                paid: r.paid
            }));
        }
        return converted;
    },

    async triggerScrape() {
        return await this.post(this.endpoints.scrape);
    },

    async getScrapeStatus() {
        return await this.fetch(this.endpoints.scrapeStatus) || { status: 'idle' };
    },

    async triggerETL() {
        return await this.post(this.endpoints.etl);
    },

    async getETLStatus() {
        return await this.fetch(this.endpoints.etlStatus) || { status: 'idle' };
    },

    async loadSchedule() {
        return await this.fetch(this.endpoints.schedule);
    },

    async saveSchedule(cronScrape, cronETL) {
        return await this.put(this.endpoints.schedule, {
            cron_scrape: cronScrape,
            cron_etl: cronETL
        });
    },

    // Stats
    async loadStats() {
        return await this.fetch(this.endpoints.stats) || {};
    },

    async loadCaveStats() {
        return await this.fetch(this.endpoints.cave) || {};
    },

    async loadChallengeStats() {
        return await this.fetch(this.endpoints.challenge) || {};
    },

    async loadRuneTicketStats() {
        return await this.fetch(this.endpoints.runeTicket) || {};
    },

    async loadUpgradePanaceaStats() {
        return await this.fetch(this.endpoints.upgradePanacea) || {};
    }
};
