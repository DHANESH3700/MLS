'use client';

import { Container, Typography, Box, Tabs, Tab, Paper, CssBaseline, AppBar, Toolbar, Button, Avatar, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { useState } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import HistoryIcon from '@mui/icons-material/History';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues with wallet connection
const BorrowerDashboard = dynamic(() => import('../components/BorrowerDashboard'), { ssr: false });
const LenderDashboard = dynamic(() => import('../components/LenderDashboard'), { ssr: false });

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        },
      },
    },
  },
});

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const { connected } = useWallet();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, mr: 1 }}>
          <MonetizationOnIcon />
        </Avatar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          Aptos Lend
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem 
          component="div"
          sx={{
            backgroundColor: tabValue === 0 ? 'action.selected' : 'inherit',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            cursor: 'pointer',
          }}
          onClick={() => setTabValue(0)}
        >
          <ListItemIcon>
            <RequestQuoteIcon color={tabValue === 0 ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Borrower" />
        </ListItem>
        <ListItem 
          component="div"
          sx={{
            backgroundColor: tabValue === 1 ? 'action.selected' : 'inherit',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            cursor: 'pointer',
          }}
          onClick={() => setTabValue(1)}
        >
          <ListItemIcon>
            <AccountBalanceWalletIcon color={tabValue === 1 ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Lender" />
        </ListItem>
        <ListItem 
          component="div"
          sx={{
            backgroundColor: tabValue === 2 ? 'action.selected' : 'inherit',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            cursor: 'pointer',
          }}
          onClick={() => setTabValue(2)}
        >
          <ListItemIcon>
            <HistoryIcon color={tabValue === 2 ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText primary="Transaction History" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* Mobile Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
          }}
        >
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
              boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.1)',
              backgroundColor: 'white',
              color: 'text.primary',
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                {tabValue === 0 ? 'Borrower Dashboard' : tabValue === 1 ? 'Lender Dashboard' : 'Transaction History'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WalletSelector />
                {connected && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DashboardIcon />}
                    sx={{ borderRadius: 20, px: 3 }}
                  >
                    Dashboard
                  </Button>
                )}
              </Box>
            </Toolbar>
          </AppBar>

          <Toolbar /> {/* This pushes content below the app bar */}

          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

            <TabPanel value={tabValue} index={0}>
              <BorrowerDashboard />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <LenderDashboard />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Transaction History
                </Typography>
                <Typography color="text.secondary">
                  Your transaction history will appear here.
                </Typography>
              </Paper>
            </TabPanel>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
