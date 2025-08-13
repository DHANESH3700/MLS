import { useCallback, useMemo } from 'react';
import { useWallet } from '../components/WalletProvider';
import { 
  USDC_COIN, 
  CONTRACT_ADDRESS, 
  MODULE_NAME, 
  createEntryFunctionPayload, 
  submitTransaction,
  aptos,
  formatUsdc,
  parseUsdc
} from '../config';
import { Account } from '@aptos-labs/ts-sdk';

// Extend the Account type to include the address property
type AccountWithAddress = Account & { address: string };

type LoanOffer = {
  id: string;
  lender: string;
  amount: number;
  interestRate: number;
  duration: number;
  collateralRatio: number;
  status: 'active' | 'fulfilled' | 'cancelled';
};

type LoanRequest = {
  id: string;
  borrower: string;
  amount: number;
  duration: number;
  status: 'pending' | 'approved' | 'rejected' | 'repaid' | 'defaulted';
  offerId: string;
};

const useLendingContract = () => {
  const { account, isConnected } = useWallet() as { account: AccountWithAddress | null; isConnected: boolean };

  // Helper function to check if wallet is connected
  const ensureConnected = useCallback(() => {
    if (!isConnected || !account) {
      throw new Error('Please connect your wallet first');
    }
    return account;
  }, [isConnected, account]);

  // Create a new loan offer
  const createLoanOffer = useCallback(async (
    amount: number,
    interestRate: number,
    duration: number,
    collateralRatio: number
  ) => {
    const currentAccount = ensureConnected();
    
    // Convert USD amount to USDC atomic units
    const usdcAmount = parseUsdc(amount);
    
    const payload = createEntryFunctionPayload(
      'create_offer',
      [USDC_COIN],
      [usdcAmount.toString(), interestRate, duration, collateralRatio]
    );

    return submitTransaction(currentAccount, payload);
  }, [ensureConnected]);

  // Cancel a loan offer
  const cancelLoanOffer = useCallback(async (offerId: string) => {
    const currentAccount = ensureConnected();
    
    const payload = createEntryFunctionPayload(
      'cancel_offer',
      [USDC_COIN],
      [offerId]
    );

    return submitTransaction(currentAccount, payload);
  }, [ensureConnected]);

  // Request a loan against an offer
  const requestLoan = useCallback(async (offerId: string, amount: number, collateralAmount: number) => {
    const currentAccount = ensureConnected();
    
    // Convert USD amounts to USDC atomic units
    const usdcAmount = parseUsdc(amount);
    const usdcCollateral = parseUsdc(collateralAmount);
    
    const payload = createEntryFunctionPayload(
      'request_loan',
      [USDC_COIN],
      [offerId, usdcAmount.toString(), usdcCollateral.toString()]
    );

    return submitTransaction(currentAccount, payload);
  }, [ensureConnected]);

  // Approve a loan request
  const approveLoanRequest = useCallback(async (requestId: string) => {
    const currentAccount = ensureConnected();
    
    const payload = createEntryFunctionPayload(
      'approve_loan',
      [USDC_COIN],
      [requestId]
    );

    return submitTransaction(currentAccount, payload);
  }, [ensureConnected]);

  // Repay a loan
  const repayLoan = useCallback(async (loanId: string, amount: number) => {
    const currentAccount = ensureConnected();
    
    // Convert USD amount to USDC atomic units
    const usdcAmount = parseUsdc(amount);
    
    const payload = createEntryFunctionPayload(
      'repay_loan',
      [USDC_COIN],
      [loanId, usdcAmount.toString()]
    );

    return submitTransaction(currentAccount, payload);
  }, [ensureConnected]);

  // Get all loan offers
  const getLoanOffers = useCallback(async (): Promise<LoanOffer[]> => {
    if (!account) return [];
    
    try {
      const response = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_all_offers`,
          typeArguments: [USDC_COIN],
          functionArguments: []
        }
      });
      
      return (response as any[]).map((offer: any) => ({
        id: offer.id,
        lender: offer.lender,
        amount: formatUsdc(offer.amount), // Convert from USDC atomic units to USD
        interestRate: Number(offer.interest_rate) / 100, // Convert from basis points to percentage
        duration: Number(offer.duration_seconds),
        collateralRatio: Number(offer.collateral_ratio) / 100, // Convert from basis points to percentage
        status: (offer.status as string).toLowerCase() as 'active' | 'fulfilled' | 'cancelled'
      }));
    } catch (error) {
      console.error('Error fetching loan offers:', error);
      throw new Error('Failed to fetch loan offers');
    }
  }, [account]);

  // Get all loan requests for a specific offer
  const getLoanRequests = useCallback(async (offerId?: string): Promise<LoanRequest[]> => {
    if (!account) return [];
    
    try {
      const response = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${offerId ? 'get_offer_requests' : 'get_all_requests'}`,
          typeArguments: [USDC_COIN],
          functionArguments: offerId ? [offerId] : []
        }
      });
      
      return (response as any[]).map((request: any) => ({
        id: request.id,
        borrower: request.borrower,
        amount: formatUsdc(request.amount), // Convert from USDC atomic units to USD
        duration: Number(request.duration_seconds),
        status: (request.status as string).toLowerCase() as 'pending' | 'approved' | 'rejected' | 'repaid' | 'defaulted',
        offerId: request.offer_id
      }));
    } catch (error) {
      console.error('Error fetching loan requests:', error);
      throw new Error('Failed to fetch loan requests');
    }
  }, [account]);

  // Get user's active loans
  const getUserLoans = useCallback(async (): Promise<LoanRequest[]> => {
    if (!account) return [];
    
    try {
      const response = await aptos.view({
        payload: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_user_loans`,
          typeArguments: [USDC_COIN],
          functionArguments: [account.address]
        }
      });
      
      return (response as any[]).map((loan: any) => ({
        id: loan.id,
        borrower: loan.borrower,
        amount: formatUsdc(loan.amount), // Convert from USDC atomic units to USD
        duration: Number(loan.duration_seconds),
        status: (loan.status as string).toLowerCase() as 'pending' | 'approved' | 'rejected' | 'repaid' | 'defaulted',
        offerId: loan.offer_id
      }));
    } catch (error) {
      console.error('Error fetching user loans:', error);
      throw new Error('Failed to fetch user loans');
    }
  }, [account]);

  return useMemo(() => ({
    // Contract interaction functions
    createLoanOffer,
    cancelLoanOffer,
    requestLoan,
    approveLoanRequest,
    repayLoan,
    
    // View functions
    getLoanOffers,
    getLoanRequests,
    getUserLoans,
    
    // State
    isConnected,
    accountAddress: account?.address?.toString() || null,
  }), [
    account,
    isConnected,
    createLoanOffer,
    cancelLoanOffer,
    requestLoan,
    approveLoanRequest,
    repayLoan,
    getLoanOffers,
    getLoanRequests,
    getUserLoans,
  ]);
};

export default useLendingContract;
