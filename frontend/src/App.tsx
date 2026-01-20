import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConversationExplorer } from './components/ConversationExplorer';
import { ConversationDetail } from './components/ConversationDetail';

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
          <Route path="/" element={<ConversationExplorer />} />
          <Route path="/conversations/:id" element={<ConversationDetail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
