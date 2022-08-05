import { styled } from '@mui/material/styles'
import { Box } from "@mui/material"

export const VotePageContainer = styled(Box)(({ theme }) => ({
  margin: '0px auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  padding: '10px',
  paddingTop: '0px',
  width: '70%',
  gap: '10px',
  [theme.breakpoints.between('md', 'lg')]: {
    width: '90%',
    padding: '0px',
  },
  [theme.breakpoints.between('sm', 'md')]: {
    width: '90%',
    padding: '0px',
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    padding: '0px',
  },

}));

export const VoteContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
}));

export const VoteContentAction = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
}));

export const NftContainer = styled(Box)(({ theme, active }) => ({
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  background: active ? theme.palette.background.secondary : theme.palette.background.default,
  borderRadius: theme.palette.primary.borderRadius,
  border: theme.palette.primary.border,
  cursor: 'pointer'
}))

export const Card = styled(Box)(({ theme}) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: theme.palette.background.secondary,
  borderRadius: theme.palette.primary.borderRadius,
  width: '100%',
}))
