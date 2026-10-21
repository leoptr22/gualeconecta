import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline,ThemeProvider,createTheme,useMediaQuery } from '@mui/material';
import App from './App';
import './styles.css';
import './motion.css';
import './media.css';
import './glass.css';
import './brutal.css';
function Root(){const dark=useMediaQuery('(prefers-color-scheme: dark)');const theme=createTheme({palette:{mode:dark?'dark':'light',primary:{main:dark?'#c7b4ff':'#6333ee'},secondary:{main:'#ff76b0'},background:{default:dark?'#201d29':'#fff6df',paper:dark?'#302b3d':'#fffdf5'},text:{primary:dark?'#fff6df':'#18181b',secondary:dark?'#d0c6dd':'#514954'}},typography:{fontFamily:'"Manrope","Segoe UI",Arial,sans-serif',h6:{fontWeight:700,fontSize:'1.15rem'},h5:{fontWeight:750},button:{textTransform:'none',fontWeight:650}},shape:{borderRadius:14},components:{MuiButton:{styleOverrides:{root:{boxShadow:'none',padding:'10px 18px'}}},MuiDialogActions:{styleOverrides:{root:{padding:'16px 24px'}}}}});
return <ThemeProvider theme={theme}><CssBaseline/><App/></ThemeProvider>;}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);

