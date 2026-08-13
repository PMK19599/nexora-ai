import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../config/database';

jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  return {
    ...original,
    connect: jest.fn(),
    connection: { host: 'localhost' },
    set: jest.fn(),
  };
});

jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: {
    create: jest.fn(),
  }
}));

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('connects to configured MongoDB successfully', async () => {
    (mongoose.connect as jest.Mock).mockResolvedValueOnce(mongoose);
    
    await connectDB();
    
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(MongoMemoryServer.create).not.toHaveBeenCalled();
  });

  it('throws and prevents fallback when production DB connection fails', async () => {
    process.env.NODE_ENV = 'production';
    const connectionError = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValueOnce(connectionError);

    await expect(connectDB()).rejects.toThrow('Connection failed');
    
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(MongoMemoryServer.create).not.toHaveBeenCalled();
  });

  it('uses in-memory fallback when non-production DB connection fails', async () => {
    process.env.NODE_ENV = 'development';
    const connectionError = new Error('Connection failed');
    
    // First call to configured DB fails
    (mongoose.connect as jest.Mock).mockRejectedValueOnce(connectionError);
    
    // Setup memory server mock
    const mockMemoryServer = { getUri: jest.fn().mockReturnValue('mongodb://memory:27017') };
    (MongoMemoryServer.create as jest.Mock).mockResolvedValueOnce(mockMemoryServer);
    
    // Second call to memory DB succeeds
    (mongoose.connect as jest.Mock).mockResolvedValueOnce(mongoose);

    await connectDB();
    
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
    expect(MongoMemoryServer.create).toHaveBeenCalledTimes(1);
  });
});
