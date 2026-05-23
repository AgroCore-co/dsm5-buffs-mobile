let _connected = true;

export const __setConnected = (val: boolean) => { _connected = val; };

const NetInfo = {
  fetch: jest.fn(async () => ({ isConnected: _connected, isInternetReachable: _connected })),
  addEventListener: jest.fn(() => jest.fn()),
};

export default NetInfo;
