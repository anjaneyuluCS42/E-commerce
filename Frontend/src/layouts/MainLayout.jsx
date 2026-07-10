import Navbar from '../components/Navbar.tsx';
import Footer from '../components/Footer';
import Toast from '../components/ui/Toast';
import Chatbot from '../components/Chatbot';

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <Toast />
      <Chatbot />
    </div>
  );
}
