// Network Request Logger - Intercept all fetch requests

const originalFetch = global.fetch;

export function enableNetworkLogger() {
  global.fetch = async (...args) => {
    const [url, options] = args;
    
    console.log('🌐 Network Request:', {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body,
    });

    try {
      const response = await originalFetch(...args);
      
      console.log('✅ Network Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      return response;
    } catch (error) {
      console.log('❌ Network Error:', {
        url,
        error,
      });
      throw error;
    }
  };
}

export function disableNetworkLogger() {
  global.fetch = originalFetch;
}
