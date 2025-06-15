// types.ts - NFC関連の型定義

export interface DeviceFilter {
  vendorId: number;
  productId: number;
  deviceModel: number;
}

export interface DeviceEndpoints {
  in: number;
  out: number;
}

export interface NFCReadResult {
  idm: string;
  timestamp: Date;
}

export interface NFCReaderOptions {
  pollingInterval?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface NFCReaderState {
  isConnected: boolean;
  isReading: boolean;
  error: string | null;
  lastRead: NFCReadResult | null;
}

export class NFCError extends Error {
  constructor(
    message: string,
    public code: NFCErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NFCError';
  }
}

export enum NFCErrorCode {
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  READ_TIMEOUT = 'READ_TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  DEVICE_BUSY = 'DEVICE_BUSY',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// WebUSB API型定義をここに配置
declare global {
  interface Navigator {
    usb: USB;
  }

  interface USB {
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    productId: number;
    vendorId: number;
    productName?: string;
    manufacturerName?: string;
    serialNumber?: string;
    configuration: USBConfiguration;
    configurations: USBConfiguration[];
    opened: boolean;
    
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  }

  interface USBConfiguration {
    configurationValue: number;
    configurationName?: string;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    interfaceName?: string;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'bulk' | 'interrupt' | 'isochronous';
    packetSize: number;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USBInTransferResult {
    data: DataView;
    status: 'ok' | 'stall' | 'babble';
  }
}