import axios from 'axios';

// Derive backend URL dynamically so mobile/LAN devices resolve the correct host.
// If VITE_API_URL is set in .env, use that. Otherwise, use the same hostname
// the browser loaded this page from (works for both localhost and 192.168.x.x).
const resolvedBaseURL =
    import.meta.env.VITE_API_URL ??
    `http://${window.location.hostname}:3000`;


console.log("BASE URL", resolvedBaseURL)
const apiClient = axios.create({
    baseURL: resolvedBaseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});



apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 404) {
            const url = error.config?.url || '';
            const match = url.match(/\/wallets\/([0-9a-fA-F-]+)/);
            if (match) {
                const walletId = match[1];
                try {
                    const recent = localStorage.getItem('badrgo_recent_wallets');
                    if (recent) {
                        const parsed = JSON.parse(recent);
                        localStorage.setItem('badrgo_recent_wallets', JSON.stringify(parsed.filter((w: any) => w.id !== walletId)));
                    }
                    const userWallets = localStorage.getItem('badrgo_user_wallets');
                    if (userWallets) {
                        const parsed = JSON.parse(userWallets);
                        for (const userId in parsed) {
                            parsed[userId] = parsed[userId].filter((w: any) => w.id !== walletId);
                        }
                        localStorage.setItem('badrgo_user_wallets', JSON.stringify(parsed));
                    }
                    window.dispatchEvent(new Event('recent_wallets_updated'));
                } catch { }
            }
        }

        const message = error.response?.data?.message ?? error.message ?? 'An unexpected error occurred';
        return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
    },
);

export default apiClient;
