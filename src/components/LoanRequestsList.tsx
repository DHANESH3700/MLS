'use client';

import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Button, Chip } from '@mui/material';

import { useWallet, InputTransactionData } from '@aptos-labs/wallet-adapter-react';

import { aptos, formatUsdc } from '@/config';
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || '';
import { LoanRequest } from '@/types';

const LoanRequestsList = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ [key: string]: { loading: boolean; error: string | null } }>({});
  const [approvalFiles, setApprovalFiles] = useState<{ [key: string]: File | null }>({});

  const fetchRequests = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const platformConfig = await aptos.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::lending::PlatformConfig`,
      });

      const totalRequests = (platformConfig.data as any).total_requests;
      const loanRequestsTableHandle = (platformConfig.data as any).loan_requests.handle;
      const requestPromises = [];

      for (let i = 0; i < totalRequests; i++) {
        requestPromises.push(
          aptos.getTableItem<LoanRequest>({
            handle: loanRequestsTableHandle,
            data: { key: i.toString(), key_type: 'u64', value_type: `${MODULE_ADDRESS}::lending::LoanRequest` },
          })
        );
      }

      const fetchedRequests = await Promise.all(requestPromises);

      // Filter to only show requests where the connected user is the lender
      setRequests(fetchedRequests.filter(req => req.lender === account.address.toString() && req.status === 0));
    } catch (e: any) {
      console.error(e);
      setError('Failed to fetch loan requests. Is the module deployed and initialized?');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    if (!account) return;

    const approvalFile = approvalFiles[requestId];
    if (!approvalFile) {
      setActionStatus(prev => ({ ...prev, [requestId]: { loading: false, error: 'Please upload an approval letter.' } }));
      return;
    }

    setActionStatus(prev => ({ ...prev, [requestId]: { loading: true, error: null } }));

    // In a real app, upload the file to IPFS to get a real hash.
    const approvalLetterHash = `dummy_approval_${Date.now()}`;

    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::lending::approve_loan_request`,
        functionArguments: [requestId, approvalLetterHash],
      },
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setActionStatus(prev => ({ ...prev, [requestId]: { loading: false, error: null } }));
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      setActionStatus(prev => ({ ...prev, [requestId]: { loading: false, error: e.message || 'An error occurred.' } }));
    }
  };

    const handleReject = async (requestId: string) => {
    if (!account) return;

    setActionStatus(prev => ({ ...prev, [requestId]: { loading: true, error: null } }));

    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::lending::reject_request`,
        functionArguments: [requestId],
      },
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setActionStatus(prev => ({ ...prev, [requestId]: { loading: false, error: null } }));
      fetchRequests(); // Refresh the list
    } catch (e: any) {
      console.error(e);
      setActionStatus(prev => ({ ...prev, [requestId]: { loading: false, error: e.message || 'An error occurred.' } }));
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Your Pending Loan Requests
      </Typography>
      {requests.length === 0 ? (
        <Typography>You have no pending loan requests.</Typography>
      ) : (
        <List>
          {requests.map((req) => (
            <ListItem
              key={req.request_id}
              divider
              secondaryAction={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
                    <Button component="label" variant="outlined" size="small">
                      Upload Approval
                      <input 
                        type="file" 
                        hidden 
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          setApprovalFiles(prev => ({ ...prev, [req.request_id]: file }));
                        }}
                      />
                    </Button>
                    {approvalFiles[req.request_id] && <Chip label={approvalFiles[req.request_id]?.name} size="small" onDelete={() => setApprovalFiles(prev => ({ ...prev, [req.request_id]: null }))} />}
                  </Box>
                  <Box sx={{display: 'flex', gap: 1}}>
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={() => handleApprove(req.request_id)}
                      disabled={actionStatus[req.request_id]?.loading}
                    >
                      {actionStatus[req.request_id]?.loading ? <CircularProgress size={24} /> : 'Approve'}
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={() => handleReject(req.request_id)}
                      disabled={actionStatus[req.request_id]?.loading}
                    >
                      {actionStatus[req.request_id]?.loading ? <CircularProgress size={24} /> : 'Reject'}
                    </Button>
                  </Box>
                </Box>
              }
            >
              <ListItemText
                primary={`Request #${req.request_id} from ${req.borrower}`}
                secondary={
                  <Box component="span">
                    <Typography component="span" variant="body2">
                      {`Amount: ${formatUsdc(parseInt(req.loan_amount))} USDC | Collateral: ${formatUsdc(parseInt(req.collateral_amount))} USDC`}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Borrower Docs: <a href={`#${req.borrower_details_hash}`} target="_blank" rel="noopener noreferrer">
                        {req.borrower_details_hash.substring(0, 15)}...
                      </a>
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Collateral Docs: <a href={`#${req.collateral_details_hash}`} target="_blank" rel="noopener noreferrer">
                        {req.collateral_details_hash.substring(0, 15)}...
                      </a>
                    </Typography>
                    {actionStatus[req.request_id]?.error && (
                      <Alert severity="error" sx={{ mt: 1, p: 0 }}>
                        {actionStatus[req.request_id]?.error}
                      </Alert>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default LoanRequestsList;
