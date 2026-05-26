import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useRecordStore = defineStore('records', () => {
    const todayRecords = ref([]);
    // 从 localStorage 初始化
    const savedRecords = localStorage.getItem('today_records');
    if (savedRecords) {
        try {
            todayRecords.value = JSON.parse(savedRecords);
        }
        catch (e) {
            todayRecords.value = [];
        }
    }
    const addRecord = (record) => {
        todayRecords.value.unshift(record); // 倒序排列
        saveToLocal();
    };
    const undoLastRecord = () => {
        if (todayRecords.value.length > 0) {
            const removed = todayRecords.value.shift();
            saveToLocal();
            return removed;
        }
        return null;
    };
    const saveToLocal = () => {
        localStorage.setItem('today_records', JSON.stringify(todayRecords.value));
    };
    const sortedRecords = computed(() => {
        return [...todayRecords.value].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    return {
        todayRecords,
        sortedRecords,
        addRecord,
        undoLastRecord,
    };
});
