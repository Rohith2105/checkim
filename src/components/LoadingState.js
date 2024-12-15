import { CircularProgress } from "@mui/material";

export const LoadingState = ({ message = "Loading..." }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '2rem' 
  }}>
    <CircularProgress size={24} style={{ marginRight: '1rem' }} />
    <span>{message}</span>
  </div>
); 