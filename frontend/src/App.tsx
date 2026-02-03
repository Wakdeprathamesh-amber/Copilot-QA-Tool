import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConversationExplorer } from './components/ConversationExplorer';
import { ConversationDetail } from './components/ConversationDetail';
import { LoginPage } from './components/LoginPage';
import { RequireAuth } from './components/RequireAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <ConversationExplorer />
              </RequireAuth>
            }
          />
          <Route
            path="/conversations/:id"
            element={
              <RequireAuth>
                <ConversationDetail />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
