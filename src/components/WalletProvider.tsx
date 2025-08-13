'use client';

import { 
  AptosWalletAdapterProvider,
  useWallet as useAptosWallet,
  NetworkInfo,
} from '@aptos-labs/wallet-adapter-react';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Account } from '@aptos-labs/ts-sdk';

type WalletName = string;

type WalletContextType = {
  account: Account | null;
  accountAddress: string | null;
  connect: (walletName: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  network: NetworkInfo | null;
  wallet: any | null;
  wallets: any[];
};

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

const WalletProviderInner = ({ children }: { children: ReactNode }) => {
  const { 
    connect: connectWallet, 
    disconnect: disconnectWallet, 
    account, 
    network, 
    wallet, 
    wallets, 
    connected
  } = useAptosWallet();
  
  const [accountObj, setAccountObj] = useState<Account | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize account object when wallet is connected
  useEffect(() => {
    const initAccount = async () => {
      if (connected && account) {
        try {
          setIsConnecting(true);
          // Create a simple account object with the address
          // We don't have the private key, so we can't sign transactions directly
          const accountObj = {
            address: account.address,
            // Add any other required account methods with stubs
            signTransaction: async () => { 
              throw new Error('Cannot sign transactions directly in WalletProvider'); 
            }
          } as unknown as Account;
          setAccountObj(accountObj);
        } catch (error) {
          console.error('Error initializing account:', error);
          await disconnectWallet();
        } finally {
          setIsConnecting(false);
        }
      } else {
        setAccountObj(null);
      }
    };

    initAccount();
  }, [connected, account, disconnectWallet]);
  
  // Update isConnecting based on wallet state
  useEffect(() => {
    if (connected) {
      setIsConnecting(false);
    }
  }, [connected]);

  const connect = async (walletName: WalletName) => {
    try {
      setIsConnecting(true);
      await connectWallet(walletName);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsConnecting(true);
      await disconnectWallet();
      setAccountObj(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const value = useMemo(
    () => ({
      account: accountObj,
      accountAddress: account?.address?.toString() || null,
      connect,
      disconnect,
      isConnected: connected,
      isConnecting,
      network: network || null,
      wallet: wallet || null,
      wallets: wallets || [],
    }),
    [account, accountObj, connected, isConnecting, network, wallet, wallets]
  ) as WalletContextType;

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Clear any potentially corrupted wallet data from localStorage
  useEffect(() => {
    try {
      const walletState = localStorage.getItem('aptos-wallet-state');
      if (walletState) {
        JSON.parse(walletState);
      }
    } catch (e) {
      console.log('Clearing corrupted wallet state');
      localStorage.removeItem('aptos-wallet-state');
    }
  }, []);

  return (
    <AptosWalletAdapterProvider autoConnect={false}>
      <WalletProviderInner>
        {children}
      </WalletProviderInner>
    </AptosWalletAdapterProvider>
  );
};

export default WalletProvider;
