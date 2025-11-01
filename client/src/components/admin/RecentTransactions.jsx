import React from 'react';
import { 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowUpward as CreditIcon,
  ArrowDownward as DebitIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import './RecentTransactions.css'; // Import du CSS

const RecentTransactions = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Paper className="recent-transactions-container">
        <Typography variant="h6" className="recent-transactions-title" gutterBottom>
          Dernières transactions
        </Typography>
        <div className="empty-state">
          <Typography variant="body2" color="text.secondary">
            Aucune transaction récente
          </Typography>
        </div>
      </Paper>
    );
  }

  return (
    <Paper className="recent-transactions-container">
      <Typography variant="h6" className="recent-transactions-title" gutterBottom>
        Dernières transactions
      </Typography>
      <TableContainer>
        <Table size="small" className="transaction-table">
          <TableHead>
            <TableRow>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} hover>
                <TableCell className="user-cell">
                  <Typography variant="body2" className="user-name">
                    {transaction.user}
                  </Typography>
                  <Typography variant="caption" className="transaction-date">
                    {transaction.date}
                  </Typography>
                </TableCell>
                <TableCell className="amount-cell">
                  <Typography
                    fontWeight="medium"
                    className={transaction.type === 'credit' ? 'credit-amount' : 'debit-amount'}
                  >
                    {transaction.amount} XOF
                  </Typography>
                </TableCell>
                <TableCell>
                  {transaction.type === 'credit' ? (
                    <Chip 
                      icon={<CreditIcon style={{ fontSize: '14px' }} />} 
                      label="Crédit" 
                      size="small" 
                      className="type-chip"
                      color="success" 
                    />
                  ) : (
                    <Chip 
                      icon={<DebitIcon style={{ fontSize: '14px' }} />} 
                      label="Débit" 
                      size="small" 
                      className="type-chip"
                      color="error" 
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={transaction.status} 
                    size="small" 
                    className={`status-chip ${transaction.status}-status`}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Voir les détails">
                    <IconButton size="small" className="action-button">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentTransactions;