import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import CreateItemModal from './components/CreateItemModal';
import AdminPanel from './components/AdminPanel';
import ChatModal from './components/ChatModal';
import Profile from './components/Profile';
import Community from './components/Community';

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshFeed, setRefreshFeed] = useState(0);

  const [chatItem, setChatItem] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchUserProfile(session?.user?.id);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchUserProfile(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setUser(null);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error.message);
      setUser(null);
      return;
    }

    setUser(data);
  };

  const handleActionClick = () => {
    if (!user) {
      setFeedback({ type: 'error', message: 'Faça login para anunciar.' });
      setTimeout(() => setFeedback(null), 3000);
      setView('login');
      return;
    }

    if (user.type === 'ONG' && user.approval_status !== 'approved') {
      if (user.approval_status === 'pending') {
        setFeedback({ type: 'error', message: 'O seu registo de ONG ainda está em análise pelo administrador.' });
      } else if (user.approval_status === 'rejected') {
        setFeedback({ 
          type: 'error', 
          message: `O seu registo de ONG foi recusado.${user.rejection_reason ? ` Motivo: ${user.rejection_reason}` : ''}` 
        });
      } else {
        setFeedback({ type: 'error', message: 'A sua ONG ainda não está autorizada a publicar.' });
      }
      setTimeout(() => setFeedback(null), 4500);
      return;
    }

    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setView('home');
    setIsChatOpen(false);
    setChatItem(null);
  };

  const handleOpenChat = (item) => {
    if (!user) {
      setFeedback({ type: 'error', message: 'Faça login para aceder às mensagens.' });
      setTimeout(() => setFeedback(null), 3000);
      setView('login');
      return;
    }

    setChatItem(item);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setChatItem(null);
  };

  const renderMainView = () => {
    if (view === 'login') {
      return <Login setView={setView} />;
    }

    if (view === 'register') {
      return <Register setView={setView} />;
    }

    if (view === 'admin') {
      return <AdminPanel currentUser={user} />;
    }

    if (view === 'profile') {
      return (
        <Profile
          currentUser={user}
          onUpdated={() => fetchUserProfile(user?.id)}
          onLogout={handleLogout}
          onOpenChat={handleOpenChat}
        />
      );
    }

    if (view === 'community') {
      return <Community currentUser={user} onOpenChat={handleOpenChat} />;
    }

    return (
      <>
        <section
          className="hero"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '60px 40px'
          }}
        >
          <div className="hero-content" style={{ maxWidth: '60%' }}>
            <h1>Transforme o que sobra em esperança para quem precisa.</h1>
            <p>
              O Bye Buy conecta doadores a instituições. Anuncie itens que você
              não usa mais ou ajude a bater as metas dos nossos parceiros.
            </p>

            <button
              className="btn-submit"
              style={{ width: 'auto', padding: '15px 30px', fontSize: '1.1rem' }}
              onClick={handleActionClick}
            >
              {user?.type === 'ONG' ? 'Solicitar Doação' : 'Desapegar (Anunciar)'}
            </button>
          </div>

          <div className="mascot" style={{ marginRight: '80px' }}>
            <img
              src="/dinossauro_byebuy-removebg-preview.png"
              alt="Mascote Bye Buy"
              style={{ height: '300px' }}
            />
          </div>
        </section>

        <Feed
          currentUser={user}
          refreshKey={refreshFeed}
          onOpenChat={handleOpenChat}
        />
      </>
    );
  };

  return (
    <>
      {feedback && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '12px',
              background: feedback.type === 'error' ? '#fff3f3' : '#f1f7ea',
              color: feedback.type === 'error' ? '#d96b6b' : '#6a8c3a',
              border: `1px solid ${feedback.type === 'error' ? '#fcdede' : '#dcedc8'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontWeight: '600',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            {feedback.message}
            <button 
              onClick={() => setFeedback(null)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: feedback.type === 'error' ? '#d96b6b' : '#6a8c3a' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="navbar">
        <div
          className="logo"
          onClick={() => setView('home')}
          style={{ cursor: 'pointer' }}
        >
          <img
            src="/byebuy.png"
            alt="Bye Buy Logo"
            style={{
              height: '85px',
              margin: '-20px 0',
              transform: 'scale(1.4)'
            }}
          />
        </div>

        {!session ? (
          <nav id="guest-nav">
            <button className="btn-nav" onClick={() => setView('login')}>
              Entrar
            </button>
            <button
              className="btn-nav btn-primary"
              onClick={() => setView('register')}
            >
              Cadastrar
            </button>
          </nav>
        ) : (
          <nav
            id="user-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
              Olá, {user?.name?.split(' ')[0]}
            </span>

            <button className="btn-nav" onClick={() => setView('home')}>
              Mural Solidário
            </button>

            <button className="btn-nav" onClick={() => setView('community')}>
              Comunidade ONGs
            </button>

            {user?.type === 'Admin' && (
              <button className="btn-nav" onClick={() => setView('admin')}>
                ⚙️ Admin
              </button>
            )}

            <button className="btn-nav" onClick={() => setView('profile')}>
              Meu Perfil
            </button>

            <button
              className="btn-nav"
              style={{ color: 'var(--danger-color)' }}
              onClick={handleLogout}
            >
              Sair
            </button>
          </nav>
        )}
      </header>

      <main id="app-content">
        {renderMainView()}
      </main>

      <CreateItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={user}
        onCreated={() => setRefreshFeed((prev) => prev + 1)}
      />

      <ChatModal
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        currentUser={user}
        item={chatItem}
      />
    </>
  );
}