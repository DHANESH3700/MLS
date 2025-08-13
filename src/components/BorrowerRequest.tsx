'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { useWallet, InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { aptos, MODULE_ADDRESS, formatUsdc } from '@/config';
import { LoanOffer } from '@/types';

interface BorrowerRequestProps {
  offer: LoanOffer;
  onClose: () => void;
}

const BorrowerRequest = ({ offer, onClose }: BorrowerRequestProps) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState('');
  const [borrowerDetailsFile, setBorrowerDetailsFile] = useState<File | null>(null);
  const [collateralDetailsFile, setCollateralDetailsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequest = async () => {
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!borrowerDetailsFile || !collateralDetailsFile) {
      setError('Please upload both borrower and collateral documents.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Convert USDC to atomic units (6 decimals)
    const parsedAmount = Math.floor(parseFloat(amount) * 1_000_000);
    const parsedCollateral = Math.floor(parseFloat(collateral) * 1_000_000);

    // In a real app, you would upload files to IPFS here and get the hashes.
    // For now, we'll use dummy hashes.
    const borrowerDetailsHash = `dummy_borrower_${Date.now()}`;
    const collateralDetailsHash = `dummy_collateral_${Date.now()}`;

    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::lending::borrow_request`,
        functionArguments: [
          offer.lender,
          parsedAmount,
          parsedCollateral,
          borrowerDetailsHash,
          collateralDetailsHash,
        ],
      },
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setSuccess(`Loan request submitted with hash: ${response.hash}`);
      // Reset form and close modal after a delay
      setTimeout(() => {
        setAmount('');
        setCollateral('');
        setBorrowerDetailsFile(null);
        setCollateralDetailsFile(null);
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid grey', borderRadius: 2, mt: 2 }}>
      <Typography variant="h6">Request Loan Against Offer #{offer.offer_id}</Typography>
      <Typography variant="body2">Lender: {offer.lender}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Available: {formatUsdc(parseInt(offer.available_funds.value))} USDC
      </Typography>
      <TextField
        label="Loan Amount (USDC)"
        variant="outlined"
        fullWidth
        margin="normal"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        label="Collateral Amount (USDC)"
        variant="outlined"
        fullWidth
        margin="normal"
        type="number"
        value={collateral}
        onChange={(e) => setCollateral(e.target.value)}
      />
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button variant="contained" component="label">
          Upload Borrower Details
          <input
            type="file"
            hidden
            onChange={(e) => setBorrowerDetailsFile(e.target.files ? e.target.files[0] : null)}
          />
        </Button>
        {borrowerDetailsFile && <Typography variant="body2">Selected: {borrowerDetailsFile.name}</Typography>}

        <Button variant="contained" component="label">
          Upload Collateral Details
          <input
            type="file"
            hidden
            onChange={(e) => setCollateralDetailsFile(e.target.files ? e.target.files[0] : null)}
          />
        </Button>
        {collateralDetailsFile && <Typography variant="body2">Selected: {collateralDetailsFile.name}</Typography>}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleRequest} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Submit Request'}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Box>
  );
};

export default BorrowerRequest;
