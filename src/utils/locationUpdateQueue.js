import AsyncStorage from '@react-native-async-storage/async-storage';
import actions from '../redux/actions';

// Try to import NetInfo, but don't fail if it's not available
let NetInfo = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (error) {
  console.log('NetInfo not available, will use basic retry mechanism');
}

const LOCATION_QUEUE_KEY = 'failedLocationUpdates';
const MAX_RETRY_COUNT = 3;
const RETRY_INTERVAL = 30000; // 30 seconds

class LocationUpdateQueue {
  constructor() {
    this.isProcessing = false;
    this.retryTimer = null;
    this.networkUnsubscribe = null;
  }

  // Initialize the queue and start monitoring network status
  init() {
    // Listen for network status changes if NetInfo is available
    if (NetInfo) {
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && !this.isProcessing) {
          this.processQueue();
        }
      });
    }

    // Process any pending updates on init
    this.processQueue();
    
    // If NetInfo is not available, set up periodic retry
    if (!NetInfo) {
      this.scheduleRetry();
    }
  }

  // Clean up listeners
  destroy() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  // Add failed location update to queue
  async addToQueue(locationData, headers) {
    try {
      const queue = await this.getQueue();
      const newItem = {
        data: locationData,
        headers: headers,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      queue.push(newItem);
      
      // Keep only last 50 items to prevent storage bloat
      if (queue.length > 50) {
        queue.shift();
      }
      
      await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
      
      // Try to process immediately if connected
      if (NetInfo) {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected && !this.isProcessing) {
          this.processQueue();
        }
      } else {
        // If NetInfo not available, just try to process
        if (!this.isProcessing) {
          this.processQueue();
        }
      }
    } catch (error) {
      console.log('Error adding to location queue:', error);
    }
  }

  // Get queue from storage
  async getQueue() {
    try {
      const queueStr = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
      console.log('Error getting location queue:', error);
      return [];
    }
  }

  // Save queue to storage
  async saveQueue(queue) {
    try {
      await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.log('Error saving location queue:', error);
    }
  }

  // Process pending location updates
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // Check network connectivity if NetInfo is available
      if (NetInfo) {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          this.isProcessing = false;
          // Schedule retry if not connected
          this.scheduleRetry();
          return;
        }
      }

      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const remainingItems = [];
      
      // Process each item in queue
      for (const item of queue) {
        try {
          const result = await actions.logsApi(item.data, item.headers);
          
          // If successful or max retries reached, don't re-queue
          if (!result.error || item.retryCount >= MAX_RETRY_COUNT) {
            continue;
          }
          
          // If failed but can retry, increment count and re-queue
          item.retryCount++;
          remainingItems.push(item);
          
        } catch (error) {
          console.log('Error processing queued location:', error);
          
          // Re-queue if haven't exceeded retry limit
          if (item.retryCount < MAX_RETRY_COUNT) {
            item.retryCount++;
            remainingItems.push(item);
          }
        }
      }
      
      // Save remaining items back to queue
      await this.saveQueue(remainingItems);
      
      // Schedule next retry if items remain
      if (remainingItems.length > 0) {
        this.scheduleRetry();
      }
      
    } catch (error) {
      console.log('Error processing location queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Schedule retry for failed updates
  scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, RETRY_INTERVAL);
  }
}

// Create singleton instance
const locationUpdateQueue = new LocationUpdateQueue();

export default locationUpdateQueue;