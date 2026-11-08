import {createRoot} from 'react-dom/client';
import Site from '../app/site';
import '../app/globals.css';

const page = document.documentElement.dataset.page || 'home';
createRoot(document.getElementById('root')!).render(<Site page={page} />);
