'use client';

import { useEffect, useState, useCallback } from 'react';
import BorrowerRequest from './BorrowerRequest';
import { Box, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Button } from '@mui/material';

import { aptos, MODULE_ADDRESS, formatUsdc } from '@/config';
import { LoanOffer } from '@/types';

const LoanOffersList = () => {
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);

    const handleRequestClick = (offer: LoanOffer) => {
    setSelectedOffer(offer);
  };

  const handleCloseRequest = () => {
    setSelectedOffer(null);
  };

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const registry = await aptos.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::lending::LenderRegistry`,
      });

      const lenderAddresses = (registry.data as any).active_lenders;

      const offerPromises = lenderAddresses.map((lenderAddress: string) => 
        aptos.getAccountResource<LoanOffer>({
          accountAddress: lenderAddress,
          resourceType: `${MODULE_ADDRESS}::lending::LoanOffer`,
        })
      );

      const offerResources = await Promise.all(offerPromises);
      const fetchedOffers = offerResources.map(res => res.data);

      setOffers(fetchedOffers);
    } catch (e: any) {
      console.error(e);
      setError('Failed to fetch loan offers. Is the module deployed and initialized?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Available Loan Offers
      </Typography>
      {selectedOffer ? (
        <BorrowerRequest offer={selectedOffer} onClose={handleCloseRequest} />
      ) : (
        <>
          {offers.length === 0 ? (
            <Typography>No loan offers available.</Typography>
          ) : (
            <List>
              {offers.map((offer) => (
                <ListItem
                  key={offer.offer_id}
                  divider
                  secondaryAction={
                    <Button variant="contained" onClick={() => handleRequestClick(offer)}>
                      Request Loan
                    </Button>
                  }
                >
                  <ListItemText
                    primary={`Offer #${offer.offer_id} - ${formatUsdc(parseInt(offer.available_funds.value))} USDC`}
                    secondary={`Interest: ${(parseInt(offer.interest_rate) / 100).toFixed(2)}% | Duration: ${offer.loan_duration_days} days`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
    </Box>
  );
};

export default LoanOffersList;
