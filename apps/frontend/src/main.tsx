import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { routeTree } from './routeTree.gen';
import './index.css';

const queryClient = new QueryClient();

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: { queryClient },
  defaultErrorComponent: ({ error }) => {
    console.error('[Router Error]', error);
    return (
      <div className='flex min-h-screen items-center justify-center bg-[#F5F4F0] p-8'>
        <div className='max-w-sm text-center'>
          <p className='text-[16px] font-semibold text-ink'>Algo deu errado.</p>
          <p className='mt-2 text-[14px] text-muted-foreground'>
            {error?.message ?? 'Erro inesperado.'}
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-4 rounded-md bg-[#9B2531] px-4 py-2 text-[14px] font-semibold text-white'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  },
});

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        theme='light'
        position='top-center'
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #d8d2c4',
            borderRadius: 12,
            color: '#221f1c',
            fontFamily: 'IBM Plex Sans, sans-serif',
          },
        }}
        richColors
      />
    </QueryClientProvider>,
  );
}
