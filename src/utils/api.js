import { showToast } from 'vant';
const WEBHOOK_URL = 'https://hook.jijyun.cn/v1/accept/data/webhook_accept_first/yTM5zaistQ97wCeqSXYkJonLmpxR1c0v';
export async function submitRecord(record) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(record)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return true;
    }
    catch (error) {
        console.error('Submission failed:', error);
        // 容错机制：网络失败时存入 localStorage.pending_records
        const pending = JSON.parse(localStorage.getItem('pending_records') || '[]');
        pending.push(record);
        localStorage.setItem('pending_records', JSON.stringify(pending));
        showToast({
            message: '网络不佳，已暂存本地',
            type: 'fail'
        });
        return false;
    }
}
export async function syncPendingRecords() {
    const pending = JSON.parse(localStorage.getItem('pending_records') || '[]');
    if (pending.length === 0)
        return;
    const successfulIndices = [];
    for (let i = 0; i < pending.length; i++) {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pending[i])
            });
            if (response.ok) {
                successfulIndices.push(i);
            }
        }
        catch (e) {
            break; // Still offline or error, stop trying
        }
    }
    const remaining = pending.filter((_, index) => !successfulIndices.includes(index));
    localStorage.setItem('pending_records', JSON.stringify(remaining));
    if (successfulIndices.length > 0) {
        showToast({
            message: `同步了 ${successfulIndices.length} 条暂存记录`,
            type: 'success'
        });
    }
}
